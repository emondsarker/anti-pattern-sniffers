import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Minimal glob pattern matcher.
 * Supports: ** (any path), * (any name segment), {a,b} (alternatives)
 */
function matchesGlob(filePath: string, pattern: string): boolean {
  // Expand {a,b} alternatives
  const braceMatch = pattern.match(/\{([^}]+)\}/);
  if (braceMatch) {
    const alternatives = braceMatch[1].split(',');
    return alternatives.some(alt => {
      const expanded = pattern.replace(braceMatch[0], alt.trim());
      return matchesGlob(filePath, expanded);
    });
  }

  // Convert glob to regex
  let regexStr = '^';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '*' && pattern[i + 1] === '*') {
      // ** matches any path
      if (pattern[i + 2] === '/') {
        regexStr += '(?:.+/)?';
        i += 3;
      } else {
        regexStr += '.*';
        i += 2;
      }
    } else if (ch === '*') {
      // * matches any non-separator chars
      regexStr += '[^/]*';
      i++;
    } else if (ch === '?') {
      regexStr += '[^/]';
      i++;
    } else if (ch === '.') {
      regexStr += '\\.';
      i++;
    } else {
      regexStr += ch;
      i++;
    }
  }
  regexStr += '$';

  return new RegExp(regexStr).test(filePath);
}

/**
 * Check if a file path matches any of the given glob patterns.
 */
function matchesAny(filePath: string, patterns: string[]): boolean {
  return patterns.some(p => matchesGlob(filePath, p));
}

/**
 * Build a set of simple directory names to skip during traversal.
 * Extracts plain names (no globs, no slashes) from exclude patterns.
 */
function buildExcludedDirs(exclude: string[]): Set<string> {
  const dirs = new Set<string>();
  for (const pattern of exclude) {
    if (!pattern.includes('*') && !pattern.includes('/') && !pattern.includes('?')) {
      dirs.add(pattern);
    }
  }
  return dirs;
}

/**
 * Check if a relative path matches any exclude pattern.
 */
function isExcluded(normalized: string, exclude: string[], excludedDirs: Set<string>): boolean {
  // Check simple directory name exclusion
  const segments = normalized.split('/');
  for (const segment of segments) {
    if (excludedDirs.has(segment)) return true;
  }

  // Check glob-based exclusion
  for (const pattern of exclude) {
    if (pattern.includes('*') || pattern.includes('/') || pattern.includes('?')) {
      if (matchesGlob(normalized, pattern)) return true;
    }
  }

  return false;
}

/**
 * Discover files matching include patterns, excluding those matching exclude patterns.
 * Uses an iterative directory walk to avoid stack overflow on large codebases.
 * Skips excluded directories early during traversal for performance.
 * Returns sorted array of absolute file paths.
 */
export function discoverFiles(
  include: string[],
  exclude: string[],
  basePath: string,
): string[] {
  const results: string[] = [];
  const excludedDirs = buildExcludedDirs(exclude);

  // Iterative BFS directory walk
  const queue: string[] = [basePath];

  while (queue.length > 0) {
    const dir = queue.shift()!;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      // Skip hidden directories/files (., .git, etc.)
      if (entry.startsWith('.')) continue;

      // Early skip: if this directory name is in the simple exclude set, skip entirely
      if (excludedDirs.has(entry)) continue;

      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        // Check if this directory path matches any glob exclude pattern
        const relDir = relative(basePath, fullPath).replace(/\\/g, '/');
        if (!isExcluded(relDir, exclude, excludedDirs)) {
          queue.push(fullPath);
        }
      } else if (stat.isFile()) {
        const relPath = relative(basePath, fullPath).replace(/\\/g, '/');

        // Check exclude patterns
        if (isExcluded(relPath, exclude, excludedDirs)) continue;

        // Check include patterns
        if (matchesAny(relPath, include)) {
          results.push(fullPath);
        }
      }
    }
  }

  return results.sort();
}
