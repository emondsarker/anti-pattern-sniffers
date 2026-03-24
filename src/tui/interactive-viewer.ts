import { createInterface } from 'node:readline';
import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Detection, SnifferResult, PackageResult } from '../sniffers/sniffer-interface.js';

// ANSI codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const UNDERLINE = '\x1b[4m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const MAGENTA = '\x1b[35m';
const WHITE = '\x1b[37m';
const BG_CYAN = '\x1b[46m';
const BG_MAGENTA = '\x1b[45m';
const CLEAR_SCREEN = '\x1b[2J\x1b[H';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

interface SmellGroup {
  name: string;
  label: string;
  packageName?: string;
  detections: Detection[];
  collapsed: boolean;
}

interface ViewerState {
  groups: SmellGroup[];
  cursor: number; // Index into flat list of visible items
  showDetails: boolean;
  filterSmell: string | null; // null = show all
  filterFramework: string | null; // null = show all
  filterPackage: string | null; // null = show all packages
  batchSize: number;
  totalIssues: number;
  fileCount: number;
  targetDir: string;
  copied: string | null; // flash message
  flashTimeout: ReturnType<typeof setTimeout> | null;
}

function formatSmellName(name: string): string {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'error': return `${RED}●${RESET}`;
    case 'warning': return `${YELLOW}●${RESET}`;
    case 'info': return `${CYAN}●${RESET}`;
    default: return `${DIM}●${RESET}`;
  }
}

function groupDetections(
  results: Map<string, SnifferResult[]>,
  batchSize: number,
): SmellGroup[] {
  // Collect all detections grouped by sniffer name
  const bySmell = new Map<string, Detection[]>();

  for (const [, snifferResults] of results) {
    for (const result of snifferResults) {
      for (const detection of result.detections) {
        const existing = bySmell.get(detection.snifferName) || [];
        existing.push(detection);
        bySmell.set(detection.snifferName, existing);
      }
    }
  }

  const groups: SmellGroup[] = [];
  let remaining = batchSize;

  for (const [name, detections] of bySmell) {
    if (remaining <= 0) break;
    const batch = detections.slice(0, remaining);
    remaining -= batch.length;

    groups.push({
      name,
      label: formatSmellName(name),
      detections: batch,
      collapsed: false,
    });
  }

  return groups;
}

function groupDetectionsFromPackages(
  packageResults: PackageResult[],
  batchSize: number,
): SmellGroup[] {
  // Collect all detections grouped by (package + sniffer name)
  const byKey = new Map<string, { packageName: string; snifferName: string; detections: Detection[] }>();

  for (const pr of packageResults) {
    for (const [, snifferResults] of pr.result.grouped) {
      for (const result of snifferResults) {
        for (const detection of result.detections) {
          const key = `${pr.package.name}::${detection.snifferName}`;
          const existing = byKey.get(key);
          if (existing) {
            existing.detections.push(detection);
          } else {
            byKey.set(key, {
              packageName: pr.package.name,
              snifferName: detection.snifferName,
              detections: [detection],
            });
          }
        }
      }
    }
  }

  const groups: SmellGroup[] = [];
  let remaining = batchSize;

  for (const [, entry] of byKey) {
    if (remaining <= 0) break;
    const batch = entry.detections.slice(0, remaining);
    remaining -= batch.length;

    groups.push({
      name: entry.snifferName,
      label: `[${entry.packageName}] ${formatSmellName(entry.snifferName)}`,
      packageName: entry.packageName,
      detections: batch,
      collapsed: false,
    });
  }

  return groups;
}

function getVisibleItems(state: ViewerState): Array<{ type: 'group'; groupIdx: number } | { type: 'item'; groupIdx: number; itemIdx: number }> {
  const items: Array<{ type: 'group'; groupIdx: number } | { type: 'item'; groupIdx: number; itemIdx: number }> = [];

  for (let gi = 0; gi < state.groups.length; gi++) {
    const group = state.groups[gi];
    if (state.filterSmell && group.name !== state.filterSmell) continue;
    if (state.filterFramework && !group.name.startsWith(state.filterFramework + '/')) continue;
    if (state.filterPackage && group.packageName !== state.filterPackage) continue;

    items.push({ type: 'group', groupIdx: gi });

    if (!group.collapsed) {
      for (let ii = 0; ii < group.detections.length; ii++) {
        items.push({ type: 'item', groupIdx: gi, itemIdx: ii });
      }
    }
  }

  return items;
}

function render(state: ViewerState): string {
  const lines: string[] = [];
  const w = process.stdout.columns || 80;
  const hr = DIM + '─'.repeat(w) + RESET;

  // Header
  const shownIssues = state.groups.reduce((s, g) => s + g.detections.length, 0);
  lines.push('');
  lines.push(`  ${BOLD}${MAGENTA}Anti-Pattern Sniffer${RESET}  ${DIM}│${RESET}  ${BOLD}${shownIssues}${RESET}${DIM}/${state.totalIssues} issues shown  •  ${state.fileCount} files scanned${RESET}`);
  if (state.batchSize < state.totalIssues) {
    lines.push(`  ${DIM}Batch size: ${state.batchSize} (use -b to change)${RESET}`);
  }
  lines.push(hr);

  // Flash message
  if (state.copied) {
    lines.push(`  ${GREEN}${BOLD}✔ ${state.copied}${RESET}`);
    lines.push('');
  }

  // Groups and items
  const visible = getVisibleItems(state);

  for (let vi = 0; vi < visible.length; vi++) {
    const entry = visible[vi];
    const isCurrent = vi === state.cursor;
    const pointer = isCurrent ? `${CYAN}${BOLD}▸${RESET}` : ' ';

    if (entry.type === 'group') {
      const group = state.groups[entry.groupIdx];
      const arrow = group.collapsed ? '▶' : '▼';
      const count = group.detections.length;
      const highlight = isCurrent ? `${BOLD}${WHITE}` : '';
      lines.push(`  ${pointer} ${highlight}${arrow} ${group.label}${RESET} ${DIM}(${count} issue${count !== 1 ? 's' : ''})${RESET}`);
    } else {
      const group = state.groups[entry.groupIdx];
      const det = group.detections[entry.itemIdx];
      const relPath = relative(state.targetDir, det.filePath);
      const highlight = isCurrent ? `${BOLD}` : `${DIM}`;
      const bg = isCurrent ? `${UNDERLINE}` : '';
      const icon = severityIcon(det.severity);

      // Extract component name from details if available
      const compName = (det.details as Record<string, unknown>)?.componentName
        || (det.details as Record<string, unknown>)?.hookName
        || '';
      const nameStr = compName ? `${CYAN}${compName}${RESET} ` : '';

      lines.push(`  ${pointer}   ${icon} ${bg}${highlight}${relPath}${RESET}${DIM}:${det.line}${RESET} ${nameStr}${DIM}— ${truncate(det.message, w - relPath.length - 20)}${RESET}`);

      // Show details for selected item
      if (isCurrent && state.showDetails) {
        lines.push('');
        lines.push(`      ${BOLD}Message:${RESET} ${det.message}`);
        lines.push(`      ${BOLD}Suggestion:${RESET}`);
        for (const suggLine of det.suggestion.split('\n')) {
          lines.push(`      ${DIM}${suggLine}${RESET}`);
        }
        if (det.details) {
          lines.push(`      ${BOLD}Details:${RESET} ${DIM}${JSON.stringify(det.details, null, 0)}${RESET}`);
        }
        lines.push('');
      }
    }
  }

  if (visible.length === 0) {
    lines.push(`  ${DIM}No issues to display${state.filterSmell ? ' (filter active)' : ''}${RESET}`);
  }

  lines.push('');
  lines.push(hr);

  // Action bar
  const filterLabel = state.filterSmell ? `${YELLOW}[f]ilter: ${state.filterSmell}${RESET}` : `${DIM}[f]ilter${RESET}`;
  const fwLabel = state.filterFramework ? `${YELLOW}[F]ramework: ${state.filterFramework}${RESET}` : `${DIM}[F]ramework${RESET}`;
  const pkgLabel = state.filterPackage ? `${YELLOW}[P]ackage: ${state.filterPackage}${RESET}` : `${DIM}[P]ackage${RESET}`;
  const detailLabel = state.showDetails ? `${CYAN}[d]etails: on${RESET}` : `${DIM}[d]etails${RESET}`;

  lines.push(`  ${GREEN}[c]${RESET}opy as prompt  ${GREEN}[a]${RESET}ll as md  ${RED}[x]${RESET} ignore  ${filterLabel}  ${fwLabel}  ${pkgLabel}  ${detailLabel}  ${DIM}[q]uit${RESET}`);
  lines.push(`  ${DIM}↑/↓ navigate  ←/→ or enter collapse/expand  tab next group${RESET}`);

  return lines.join('\n');
}

function truncate(str: string, max: number): string {
  if (max < 10) max = 10;
  if (str.length <= max) return str;
  return str.substring(0, max - 1) + '…';
}

function detectionToPromptMarkdown(det: Detection, targetDir: string): string {
  const relPath = relative(targetDir, det.filePath);
  const lines: string[] = [];
  lines.push(`## ${formatSmellName(det.snifferName)} — \`${relPath}:${det.line}\``);
  lines.push('');
  lines.push(det.message);
  lines.push('');
  lines.push('### Suggestion');
  lines.push(det.suggestion);
  if (det.details) {
    lines.push('');
    lines.push('### Details');
    lines.push('```json');
    lines.push(JSON.stringify(det.details, null, 2));
    lines.push('```');
  }
  return lines.join('\n');
}

function allToMarkdown(state: ViewerState): string {
  const lines: string[] = [];
  lines.push('# Anti-Pattern Report');
  lines.push('');

  for (const group of state.groups) {
    if (state.filterSmell && group.name !== state.filterSmell) continue;
    if (state.filterFramework && !group.name.startsWith(state.filterFramework + '/')) continue;
    if (state.filterPackage && group.packageName !== state.filterPackage) continue;

    lines.push(`## ${group.label} (${group.detections.length} issues)`);
    lines.push('');

    for (const det of group.detections) {
      const relPath = relative(state.targetDir, det.filePath);
      lines.push(`### \`${relPath}:${det.line}\``);
      lines.push(det.message);
      lines.push('');
      lines.push('**Suggestion:**');
      lines.push(det.suggestion);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function copyToClipboard(text: string): boolean {
  try {
    const { execSync } = require('node:child_process');
    // Try different clipboard tools
    const cmds = ['xclip -selection clipboard', 'xsel --clipboard --input', 'pbcopy', 'clip.exe'];
    for (const cmd of cmds) {
      try {
        execSync(cmd, { input: text, stdio: ['pipe', 'pipe', 'pipe'] });
        return true;
      } catch {
        continue;
      }
    }
  } catch {
    // Clipboard not available
  }
  return false;
}

function addToSnifferIgnore(det: Detection, targetDir: string): void {
  const ignorePath = join(targetDir, '.snifferignore');
  const relPath = relative(targetDir, det.filePath);
  const compName = (det.details as Record<string, unknown>)?.componentName
    || (det.details as Record<string, unknown>)?.hookName
    || '';

  const entry = compName
    ? `${relPath}:${compName}  # ${det.snifferName}`
    : `${relPath}  # ${det.snifferName}`;

  // Check if already ignored
  if (existsSync(ignorePath)) {
    const existing = readFileSync(ignorePath, 'utf8');
    if (existing.includes(entry.split('  #')[0])) return;
  }

  appendFileSync(ignorePath, entry + '\n', 'utf8');
}

function flash(state: ViewerState, msg: string): void {
  state.copied = msg;
  if (state.flashTimeout) clearTimeout(state.flashTimeout);
  state.flashTimeout = setTimeout(() => {
    state.copied = null;
    process.stdout.write(CLEAR_SCREEN + render(state));
  }, 2000);
}

/**
 * Launch the interactive TUI viewer.
 * Returns a promise that resolves when the user quits.
 */
export async function interactiveViewer(
  results: Map<string, SnifferResult[]>,
  totalIssues: number,
  fileCount: number,
  targetDir: string,
  batchSize: number,
  packageResults?: PackageResult[],
): Promise<void> {
  const groups = packageResults && packageResults.length > 0
    ? groupDetectionsFromPackages(packageResults, batchSize)
    : groupDetections(results, batchSize);

  if (groups.length === 0) {
    console.log(`\n  ${GREEN}${BOLD}✔ No anti-patterns detected!${RESET}\n`);
    return;
  }

  const state: ViewerState = {
    groups,
    cursor: 0,
    showDetails: false,
    filterSmell: null,
    filterFramework: null,
    filterPackage: null,
    batchSize,
    totalIssues,
    fileCount,
    targetDir,
    copied: null,
    flashTimeout: null,
  };

  // Enter raw mode
  if (!process.stdin.isTTY) {
    // Non-interactive fallback: just print markdown
    console.log(allToMarkdown(state));
    return;
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdout.write(HIDE_CURSOR);
  process.stdout.write(CLEAR_SCREEN + render(state));

  return new Promise<void>((resolve) => {
    const cleanup = () => {
      process.stdout.write(SHOW_CURSOR);
      process.stdout.write('\n');
      if (state.flashTimeout) clearTimeout(state.flashTimeout);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onKey);
      resolve();
    };

    const redraw = () => {
      process.stdout.write(CLEAR_SCREEN + render(state));
    };

    const visible = () => getVisibleItems(state);

    const onKey = (key: string) => {
      const items = visible();
      const maxIdx = items.length - 1;

      // Ctrl+C or q = quit
      if (key === '\x03' || key === 'q' || key === 'Q') {
        cleanup();
        return;
      }

      // Arrow up or k
      if (key === '\x1b[A' || key === 'k') {
        state.cursor = Math.max(0, state.cursor - 1);
        redraw();
        return;
      }

      // Arrow down or j
      if (key === '\x1b[B' || key === 'j') {
        state.cursor = Math.min(maxIdx, state.cursor + 1);
        redraw();
        return;
      }

      // Tab = next group
      if (key === '\t') {
        // Find next group entry after cursor
        for (let i = state.cursor + 1; i < items.length; i++) {
          if (items[i].type === 'group') {
            state.cursor = i;
            redraw();
            return;
          }
        }
        // Wrap to first group
        for (let i = 0; i < items.length; i++) {
          if (items[i].type === 'group') {
            state.cursor = i;
            redraw();
            return;
          }
        }
        return;
      }

      // Enter, right arrow, or l = toggle collapse / expand
      if (key === '\r' || key === '\x1b[C' || key === 'l') {
        const current = items[state.cursor];
        if (current && current.type === 'group') {
          state.groups[current.groupIdx].collapsed = !state.groups[current.groupIdx].collapsed;
          redraw();
        }
        return;
      }

      // Left arrow or h = collapse
      if (key === '\x1b[D' || key === 'h') {
        const current = items[state.cursor];
        if (current) {
          const gi = current.type === 'group' ? current.groupIdx : current.groupIdx;
          state.groups[gi].collapsed = true;
          // Move cursor to the group header
          for (let i = 0; i < items.length; i++) {
            if (items[i].type === 'group' && items[i].groupIdx === gi) {
              state.cursor = i;
              break;
            }
          }
          redraw();
        }
        return;
      }

      // d = toggle details
      if (key === 'd' || key === 'D') {
        state.showDetails = !state.showDetails;
        redraw();
        return;
      }

      // c = copy current as AI prompt
      if (key === 'c' || key === 'C') {
        const current = items[state.cursor];
        if (current && current.type === 'item') {
          const det = state.groups[current.groupIdx].detections[current.itemIdx];
          const md = detectionToPromptMarkdown(det, state.targetDir);
          if (copyToClipboard(md)) {
            flash(state, 'Copied to clipboard as AI prompt!');
          } else {
            // Fallback: print to stdout after exiting
            flash(state, 'Clipboard unavailable — press [p] to print instead');
          }
          redraw();
        }
        return;
      }

      // p = print current detection markdown to stdout (fallback for no clipboard)
      if (key === 'p') {
        const current = items[state.cursor];
        if (current && current.type === 'item') {
          const det = state.groups[current.groupIdx].detections[current.itemIdx];
          const md = detectionToPromptMarkdown(det, state.targetDir);
          process.stdout.write(SHOW_CURSOR);
          process.stdout.write(CLEAR_SCREEN);
          console.log(md);
          console.log(`\n${DIM}Press any key to return...${RESET}`);
          // Wait for a key then redraw
          const onceKey = () => {
            process.stdout.write(HIDE_CURSOR);
            redraw();
          };
          process.stdin.once('data', onceKey);
        }
        return;
      }

      // a = copy all as markdown
      if (key === 'a' || key === 'A') {
        const md = allToMarkdown(state);
        if (copyToClipboard(md)) {
          flash(state, 'All issues copied as markdown!');
        } else {
          flash(state, 'Clipboard unavailable — use --format markdown instead');
        }
        redraw();
        return;
      }

      // x = ignore current component
      if (key === 'x' || key === 'X') {
        const current = items[state.cursor];
        if (current && current.type === 'item') {
          const group = state.groups[current.groupIdx];
          const det = group.detections[current.itemIdx];
          addToSnifferIgnore(det, state.targetDir);

          // Remove from view
          group.detections.splice(current.itemIdx, 1);
          if (group.detections.length === 0) {
            state.groups.splice(current.groupIdx, 1);
          }

          // Adjust cursor
          const newItems = visible();
          if (state.cursor >= newItems.length) {
            state.cursor = Math.max(0, newItems.length - 1);
          }

          flash(state, `Ignored — added to .snifferignore`);
          redraw();
        }
        return;
      }

      // f = cycle smell filter
      if (key === 'f') {
        const smellNames = [...new Set(state.groups.map(g => g.name))];
        if (state.filterSmell === null) {
          state.filterSmell = smellNames[0] || null;
        } else {
          const idx = smellNames.indexOf(state.filterSmell);
          if (idx === smellNames.length - 1) {
            state.filterSmell = null; // show all
          } else {
            state.filterSmell = smellNames[idx + 1];
          }
        }
        state.cursor = 0;
        redraw();
        return;
      }

      // F = cycle framework filter
      if (key === 'F') {
        const frameworks = [...new Set(state.groups.map(g => {
          const slash = g.name.indexOf('/');
          return slash !== -1 ? g.name.substring(0, slash) : 'other';
        }))];
        if (state.filterFramework === null) {
          state.filterFramework = frameworks[0] || null;
        } else {
          const idx = frameworks.indexOf(state.filterFramework);
          if (idx === frameworks.length - 1) {
            state.filterFramework = null; // show all
          } else {
            state.filterFramework = frameworks[idx + 1];
          }
        }
        state.cursor = 0;
        redraw();
        return;
      }

      // P = cycle package filter
      if (key === 'P') {
        const pkgNames = [...new Set(state.groups.map(g => g.packageName).filter(Boolean))] as string[];
        if (pkgNames.length === 0) return; // no packages to filter
        if (state.filterPackage === null) {
          state.filterPackage = pkgNames[0] || null;
        } else {
          const idx = pkgNames.indexOf(state.filterPackage);
          if (idx === pkgNames.length - 1) {
            state.filterPackage = null;
          } else {
            state.filterPackage = pkgNames[idx + 1];
          }
        }
        state.cursor = 0;
        redraw();
        return;
      }
    };

    process.stdin.on('data', onKey);
  });
}
