import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import {
  getLineNumber,
  getColumnNumber,
} from '../shared/regex-helpers.js';

/** Matches string literals used in conditionals: === 'x', !== 'x', case 'x': */
const CONDITIONAL_STRING = /(?:===\s*|!==\s*|case\s+)(['"])([^'"]+)\1/g;

/**
 * Extract string values declared in TypeScript union literal types.
 * Matches patterns like:
 *   type Mode = 'edit' | 'drag' | 'resize'
 *   flowState: 'idle' | 'extracting' | 'complete'
 *   status: 'asc' | 'desc' | false
 */
function extractUnionLiteralValues(source: string): Set<string> {
  const values = new Set<string>();

  // Pattern 1: type alias declarations — type Mode = 'edit' | 'drag'
  const typeAliasRegex = /type\s+\w+\s*=\s*((?:['"][^'"]*['"])(?:\s*\|\s*(?:['"][^'"]*['"]|[^'"\n;]*))*)/g;
  let match: RegExpExecArray | null;
  while ((match = typeAliasRegex.exec(source)) !== null) {
    extractStringsFromUnion(match[1], values);
  }

  // Pattern 2: property/param union types — prop: 'a' | 'b' | 'c'
  const propUnionRegex = /\w+\s*[?]?\s*:\s*((?:['"][^'"]*['"])(?:\s*\|\s*(?:['"][^'"]*['"]|[^'"\n;{]*))*)/g;
  while ((match = propUnionRegex.exec(source)) !== null) {
    extractStringsFromUnion(match[1], values);
  }

  return values;
}

function extractStringsFromUnion(unionPart: string, values: Set<string>): void {
  const stringLiteral = /['"]([^'"]*)['"]/g;
  let litMatch: RegExpExecArray | null;
  while ((litMatch = stringLiteral.exec(unionPart)) !== null) {
    values.add(litMatch[1]);
  }
}

/**
 * Find the character ranges of all switch block bodies in the source.
 */
function findSwitchBlockRanges(source: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const switchRegex = /\bswitch\s*\([^)]*\)\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = switchRegex.exec(source)) !== null) {
    const openBrace = match.index + match[0].length - 1;
    let depth = 1;
    let i = openBrace + 1;
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }
    ranges.push([match.index, i]);
  }
  return ranges;
}

/**
 * Check whether ALL occurrences of a string fall within switch blocks.
 */
function areAllOccurrencesInSwitchBlocks(
  indices: number[],
  switchRanges: Array<[number, number]>,
): boolean {
  return indices.every(idx =>
    switchRanges.some(([start, end]) => idx >= start && idx < end),
  );
}

const sniffer: SnifferExport = {
  name: 'magic-strings',
  description: 'Detects string literals used repeatedly in conditional logic that should be extracted to constants or enums',
  meta: {
    name: 'magic-strings',
    description: 'Detects string literals used repeatedly in conditional logic that should be extracted to constants or enums',
    framework: 'nestjs',
    category: 'custom',
    severity: 'warning',
    defaultConfig: {
      minOccurrences: 3,
      ignoredStrings: ['all', 'none'] as string[],
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const minOccurrences =
      typeof config.minOccurrences === 'number' ? config.minOccurrences : 3;
    const severity: Severity =
      (config.severity as Severity) || 'warning';
    const DEFAULT_IGNORED = ['all', 'none'];
    const ignoredStrings: string[] = Array.isArray(config.ignoredStrings)
      ? (config.ignoredStrings as string[])
      : DEFAULT_IGNORED;
    const ignoredSet = new Set(ignoredStrings);

    // We intentionally do NOT strip strings here — we need to find them.
    // But we do strip comments to avoid false positives from commented-out code.
    const withoutComments = stripBlockAndLineComments(fileContent);

    const detections: Detection[] = [];

    // Extract TypeScript union literal type values to exempt them
    const unionValues = extractUnionLiteralValues(withoutComments);

    // Collect all strings used as case labels — these are discriminated values
    const caseValues = new Set<string>();
    const caseRegex = /case\s+(['"])([^'"]+)\1/g;
    let caseMatch: RegExpExecArray | null;
    while ((caseMatch = caseRegex.exec(withoutComments)) !== null) {
      caseValues.add(caseMatch[2]);
    }

    // Collect occurrences of each string in conditional contexts
    const occurrences = new Map<string, number[]>();
    const regex = new RegExp(CONDITIONAL_STRING.source, CONDITIONAL_STRING.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(withoutComments)) !== null) {
      const stringValue = match[2];
      if (ignoredSet.has(stringValue)) continue;
      if (unionValues.has(stringValue)) continue;
      if (caseValues.has(stringValue)) continue;

      // Skip comparisons against method call return values: .getIsSorted() === 'asc'
      const before = withoutComments.substring(Math.max(0, match.index - 50), match.index);
      if (/\)\s*$/.test(before)) continue;

      // Skip typeof checks — 'string', 'number', 'boolean', etc. are language primitives
      // The === is part of the match, so `before` ends just before it
      if (/typeof\s+[\w.]+\s*$/.test(before)) continue;

      if (!occurrences.has(stringValue)) {
        occurrences.set(stringValue, []);
      }
      occurrences.get(stringValue)!.push(match.index);
    }

    // Find switch block ranges to exempt strings confined to switch blocks
    const switchRanges = findSwitchBlockRanges(withoutComments);

    // Flag strings that appear >= minOccurrences times
    for (const [value, indices] of occurrences.entries()) {
      if (indices.length < minOccurrences) continue;
      if (switchRanges.length > 0 && areAllOccurrencesInSwitchBlocks(indices, switchRanges)) continue;

      // Report at the first occurrence
      const firstIndex = indices[0];
      const line = getLineNumber(fileContent, firstIndex);
      const column = getColumnNumber(fileContent, firstIndex);

      detections.push({
        snifferName: 'magic-strings',
        filePath,
        line,
        column,
        message: `String "${value}" appears in ${indices.length} conditional expressions. Extract to a constant or TypeScript enum.`,
        severity,
        suggestion:
          '**Extract repeated strings to constants or enums:**\n' +
          '```typescript\n' +
          '// Option 1: Constants\n' +
          `const ${toConstantName(value)} = '${value}';\n` +
          '\n' +
          '// Option 2: Enum\n' +
          'enum Status {\n' +
          `  ${toPascalCase(value)} = '${value}',\n` +
          '}\n' +
          '```\n' +
          '- Centralizes the value so typos are caught at compile time\n' +
          '- Makes renaming easier and safer',
        details: {
          value,
          occurrences: indices.length,
          minOccurrences,
        },
      });
    }

    return detections;
  },
};

/**
 * Strip only comments (line and block), preserving string literals.
 */
function stripBlockAndLineComments(source: string): string {
  let result = '';
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    // Line comment
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      result += '\n';
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') result += '\n';
        i++;
      }
      i += 2;
      continue;
    }

    // Preserve strings — skip through them verbatim
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      result += ch;
      i++;
      while (i < source.length) {
        result += source[i];
        if (source[i] === '\\') {
          i++;
          if (i < source.length) result += source[i];
          i++;
          continue;
        }
        if (source[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

function toConstantName(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

export default sniffer;
