import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
} from '../shared/regex-helpers.js';

/** Matches string literals used in conditionals: === 'x', !== 'x', case 'x': */
const CONDITIONAL_STRING = /(?:===\s*|!==\s*|case\s+)(['"])([^'"]+)\1/g;

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

    // We intentionally do NOT strip strings here — we need to find them.
    // But we do strip comments to avoid false positives from commented-out code.
    const withoutComments = stripBlockAndLineComments(fileContent);

    const detections: Detection[] = [];

    // Collect occurrences of each string in conditional contexts
    const occurrences = new Map<string, number[]>();
    const regex = new RegExp(CONDITIONAL_STRING.source, CONDITIONAL_STRING.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(withoutComments)) !== null) {
      const stringValue = match[2];
      if (!occurrences.has(stringValue)) {
        occurrences.set(stringValue, []);
      }
      occurrences.get(stringValue)!.push(match.index);
    }

    // Flag strings that appear >= minOccurrences times
    for (const [value, indices] of occurrences.entries()) {
      if (indices.length < minOccurrences) continue;

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
