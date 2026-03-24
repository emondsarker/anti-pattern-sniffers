/**
 * Generic regex utilities shared across all framework sniffers.
 * Framework-specific patterns live in their own regex-helpers files.
 */

/**
 * Extract a brace-balanced block starting from a given index.
 * The character at `startIndex` should be '{'.
 * Returns the substring including the braces, or null if unbalanced.
 */
export function extractBracedBlock(source: string, startIndex: number): string | null {
  if (source[startIndex] !== '{') return null;

  let depth = 0;
  let inString: string | null = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inTemplateLiteral = false;

  for (let i = startIndex; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\' && (inString || inTemplateLiteral)) {
      escaped = true;
      continue;
    }

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }

    if (inTemplateLiteral) {
      if (ch === '`') inTemplateLiteral = false;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === '`') {
      inTemplateLiteral = true;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return source.substring(startIndex, i + 1);
      }
    }
  }

  return null;
}

/**
 * Get the 1-indexed line number for a character offset.
 */
export function getLineNumber(source: string, charIndex: number): number {
  let line = 1;
  for (let i = 0; i < charIndex && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

/**
 * Get the 1-indexed column number for a character offset.
 */
export function getColumnNumber(source: string, charIndex: number): number {
  let col = 1;
  for (let i = charIndex - 1; i >= 0; i--) {
    if (source[i] === '\n') break;
    col++;
  }
  return col;
}

/**
 * Count regex matches in a string.
 */
export function countMatches(source: string, regex: RegExp): number {
  const global = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  const matches = source.match(global);
  return matches ? matches.length : 0;
}

/**
 * Strip comments and string literals from source code.
 * Useful for avoiding false positives from commented-out code.
 */
export function stripCommentsAndStrings(source: string): string {
  let result = '';
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      result += '\n';
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') result += '\n';
        i++;
      }
      i += 2;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < source.length) {
        if (source[i] === '\\') {
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          i++;
          break;
        }
        if (source[i] === '\n') result += '\n';
        i++;
      }
      result += '""';
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Parse destructured prop names from a destructuring pattern string.
 * Input: " a, b = 'default', c, ...rest "
 * Output: ["a", "b", "c"] (excludes rest params)
 */
export function parseDestructuredProps(propsString: string): string[] {
  const props: string[] = [];
  let depth = 0;

  let current = '';
  for (const ch of propsString) {
    if ((ch === '{' || ch === '[' || ch === '(') ) depth++;
    if ((ch === '}' || ch === ']' || ch === ')') ) depth--;
    if (ch === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) props.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last) props.push(last);

  return props
    .map(p => {
      if (p.startsWith('...')) return null;
      const colonIndex = p.indexOf(':');
      if (colonIndex !== -1) {
        const beforeColon = p.substring(0, colonIndex).trim();
        return beforeColon;
      }
      const eqIndex = p.indexOf('=');
      if (eqIndex !== -1) {
        return p.substring(0, eqIndex).trim();
      }
      return p.trim();
    })
    .filter((p): p is string => p !== null && p.length > 0);
}

/**
 * Find the opening brace index after a given position.
 */
export function findOpeningBrace(source: string, startIndex: number): number {
  for (let i = startIndex; i < source.length; i++) {
    if (source[i] === '{') return i;
    if (source[i] === ';') return -1;
  }
  return -1;
}
