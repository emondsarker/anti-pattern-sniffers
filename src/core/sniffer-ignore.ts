import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { SnifferResult } from '../sniffers/sniffer-interface.js';

export interface IgnoreEntry {
  filePath: string; // relative path (e.g., "src/components/Foo.tsx")
  componentName: string | null; // null = ignore entire file
  snifferName: string | null; // null = ignore for all sniffers
}

/**
 * Parse a .snifferignore file.
 * Format per line:
 *   path/to/file.tsx:ComponentName  # sniffer-name
 *   path/to/file.tsx  # sniffer-name
 *   path/to/file.tsx
 * Lines starting with # are comments. Empty lines are skipped.
 */
export function parseSnifferIgnore(content: string): IgnoreEntry[] {
  const entries: IgnoreEntry[] = [];

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Split off inline comment
    let main = line;
    let snifferName: string | null = null;

    const commentIdx = line.indexOf('  #');
    if (commentIdx !== -1) {
      main = line.substring(0, commentIdx).trim();
      snifferName = line.substring(commentIdx + 3).trim() || null;
    }

    // Split file:component
    const colonIdx = main.indexOf(':');
    let filePath: string;
    let componentName: string | null = null;

    if (colonIdx !== -1) {
      filePath = main.substring(0, colonIdx);
      componentName = main.substring(colonIdx + 1) || null;
    } else {
      filePath = main;
    }

    entries.push({ filePath, componentName, snifferName });
  }

  return entries;
}

/**
 * Load .snifferignore from the target directory. Returns empty array if not found.
 */
export function loadSnifferIgnore(targetDir: string): IgnoreEntry[] {
  const ignorePath = join(targetDir, '.snifferignore');
  if (!existsSync(ignorePath)) return [];

  try {
    const content = readFileSync(ignorePath, 'utf8');
    return parseSnifferIgnore(content);
  } catch {
    return [];
  }
}

/**
 * Filter out ignored detections from results.
 */
export function applySnifferIgnore(
  results: SnifferResult[],
  ignoreEntries: IgnoreEntry[],
  targetDir: string,
): SnifferResult[] {
  if (ignoreEntries.length === 0) return results;

  return results.map(result => {
    const filteredDetections = result.detections.filter(det => {
      const relPath = relative(targetDir, det.filePath);

      for (const entry of ignoreEntries) {
        // Check file path match
        if (relPath !== entry.filePath && det.filePath !== entry.filePath) continue;

        // Check sniffer name match (null = all sniffers)
        if (entry.snifferName && entry.snifferName !== det.snifferName) continue;

        // Check component name match (null = entire file)
        if (entry.componentName) {
          const detComp = (det.details as Record<string, unknown>)?.componentName
            || (det.details as Record<string, unknown>)?.hookName;
          if (detComp !== entry.componentName) continue;
        }

        // Matched an ignore entry — filter out
        return false;
      }

      return true;
    });

    return { ...result, detections: filteredDetections };
  });
}
