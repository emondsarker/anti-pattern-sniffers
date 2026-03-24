import type { SnifferResult, Detection } from '../sniffers/sniffer-interface.js';

export function renderMarkdown(
  results: Map<string, SnifferResult[]>,
  _config: Record<string, unknown>,
): string {
  const lines: string[] = [];

  // Collect all detections grouped by file, and build summary
  const fileDetections = new Map<string, Detection[]>();
  const summary = new Map<string, { count: number; severity: string }>();
  let totalIssues = 0;

  for (const [, snifferResults] of results) {
    for (const result of snifferResults) {
      for (const detection of result.detections) {
        const existing = fileDetections.get(detection.filePath) ?? [];
        existing.push(detection);
        fileDetections.set(detection.filePath, existing);
        totalIssues++;

        const summaryEntry = summary.get(detection.snifferName) ?? {
          count: 0,
          severity: detection.severity,
        };
        summaryEntry.count++;
        summary.set(detection.snifferName, summaryEntry);
      }
    }
  }

  const fileCount = results.size;
  const date = new Date().toISOString().split('T')[0];

  lines.push('# Anti-Pattern Report');
  lines.push('');
  lines.push(`**Scanned**: ${fileCount} files | **Issues found**: ${totalIssues} | **Date**: ${date}`);

  if (totalIssues === 0) {
    lines.push('');
    lines.push('✅ No anti-patterns detected!');
    return lines.join('\n');
  }

  lines.push('');
  lines.push('---');

  // Render detections per file
  for (const [filePath, detections] of fileDetections) {
    lines.push('');
    lines.push(`## \`${filePath}\``);

    for (const detection of detections) {
      lines.push('');
      lines.push(`### ⚠ ${formatSnifferName(detection.snifferName)} (line ${detection.line})`);
      lines.push(detection.message);
      lines.push('');
      lines.push('**Suggestion:**');
      lines.push(`> ${detection.suggestion}`);
    }

    lines.push('');
    lines.push('---');
  }

  // Summary table
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Sniffer | Issues | Severity |');
  lines.push('|---------|--------|----------|');

  for (const [snifferName, entry] of summary) {
    lines.push(`| ${formatSnifferName(snifferName)} | ${entry.count} | ${entry.severity} |`);
  }

  return lines.join('\n');
}

function formatSnifferName(name: string): string {
  // Handle namespaced names: "express/god-routes" → "Express > God Routes"
  if (name.includes('/')) {
    const [framework, sniffer] = name.split('/');
    const fwLabel = framework.charAt(0).toUpperCase() + framework.slice(1);
    const snifferLabel = sniffer.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `${fwLabel} > ${snifferLabel}`;
  }
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
