/**
 * Shared regex patterns and utility functions for React code parsing.
 * All sniffers depend on these for consistent detection.
 */

// Matches functional component declarations (PascalCase)
// Group 1: function declaration, Group 2: memo/forwardRef, Group 3: const assignment
// Uses [^=\n]* (non-greedy removed, bounded by newline) to avoid catastrophic backtracking on TS annotations
export const FUNCTIONAL_COMPONENT_DECL =
  /(?:function\s+([A-Z][a-zA-Z0-9]*)\s*\(|(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*(?::[^=\n]*)?\s*=\s*(?:React\.)?(?:memo|forwardRef)\s*\(\s*(?:function\s*\w*\s*)?\(|(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*(?::[^=\n]*)?\s*=\s*(?:function\s*\w*\s*)?\()/g;

// Matches destructured props in function parameters: ({ a, b, c })
// Use on the text starting from the opening ( of a component
export const DESTRUCTURED_PROPS = /\(\s*\{([^}]*)\}/;

// Matches a JSX opening tag with PascalCase name
// Group 1: component name, Group 2: attributes text
// Uses [^>]* instead of [\s\S]*? to avoid catastrophic backtracking on large files
export const JSX_OPENING_TAG = /<([A-Z][a-zA-Z0-9.]*)(\s[^>]*?)?\s*(?:\/>|>)/g;

// Matches an individual JSX attribute (not spread)
// Group 1: attribute name
export const JSX_ATTRIBUTE = /(?:^|\s)([a-zA-Z][\w-]*)(?:\s*=\s*(?:\{[^}]*\}|"[^"]*"|'[^']*'|[^\s/>]*)|\s*(?=[/>\s]))/g;

// Matches JSX spread attribute: {...expr}
export const JSX_SPREAD = /\{\s*\.\.\.(\w+)\s*\}/g;

// Matches custom hook declarations
// Group 1 (function decl) or Group 2 (const assignment): hook name
export const CUSTOM_HOOK_DECL =
  /(?:function\s+(use[A-Z]\w*)\s*\(|(?:const|let|var)\s+(use[A-Z]\w*)\s*=)/g;

// Hook call patterns
export const USE_STATE = /\buseState\s*(?:<[^>]*>)?\s*\(/g;
export const USE_EFFECT = /\buseEffect\s*\(/g;
export const USE_CALLBACK = /\buseCallback\s*\(/g;
export const USE_MEMO = /\buseMemo\s*\(/g;
export const USE_REF = /\buseRef\s*(?:<[^>]*>)?\s*\(/g;
export const USE_CONTEXT = /\buseContext\s*\(/g;
export const USE_REDUCER = /\buseReducer\s*\(/g;
export const USE_LAYOUT_EFFECT = /\buseLayoutEffect\s*\(/g;

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

    // Handle line comments
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }

    // Handle block comments
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++; // skip '/'
      }
      continue;
    }

    // Handle strings
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }

    // Handle template literals
    if (inTemplateLiteral) {
      if (ch === '`') inTemplateLiteral = false;
      // Template literal ${} expressions can contain braces,
      // but for our purposes we skip the whole template literal
      continue;
    }

    // Detect start of comments
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

    // Detect start of strings
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === '`') {
      inTemplateLiteral = true;
      continue;
    }

    // Track braces
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

    // Line comment
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      result += '\n'; // preserve line count
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') result += '\n'; // preserve line count
        i++;
      }
      i += 2; // skip */
      continue;
    }

    // String literals
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
        if (source[i] === '\n') result += '\n'; // preserve line count
        i++;
      }
      result += '""'; // placeholder to maintain structure
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

  // Split by commas, but respect nesting
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
      // Skip rest params
      if (p.startsWith('...')) return null;
      // Handle rename: originalName: newName
      const colonIndex = p.indexOf(':');
      if (colonIndex !== -1) {
        // Could be type annotation in TS or rename
        const beforeColon = p.substring(0, colonIndex).trim();
        return beforeColon;
      }
      // Handle default values: name = defaultValue
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
 * Skips parentheses, arrow functions, type annotations, etc.
 */
export function findOpeningBrace(source: string, startIndex: number): number {
  for (let i = startIndex; i < source.length; i++) {
    if (source[i] === '{') return i;
    // If we hit a semicolon or another function declaration, stop
    if (source[i] === ';') return -1;
  }
  return -1;
}
