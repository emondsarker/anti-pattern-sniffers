import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import {
  FUNCTIONAL_COMPONENT_DECL,
  DESTRUCTURED_PROPS,
} from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
  parseDestructuredProps,
} from '../shared/regex-helpers.js';

function buildSuggestion(componentName: string): string {
  return (
    `**Consider refactoring \`${componentName}\`:**\n` +
    '- Group related props into object props (e.g., `userConfig`, `handlers`)\n' +
    '- Use React Context for widely-shared values\n' +
    '- Split into smaller, focused components\n' +
    '- Consider the Compound Components pattern'
  );
}

/**
 * Detect destructured props in component declarations that exceed the threshold.
 *
 * Searches for PascalCase function declarations with destructured parameters
 * and counts the individual prop names.
 */
function detectDestructuredProps(
  cleaned: string,
  originalSource: string,
  filePath: string,
  threshold: number,
  severity: Severity,
): Detection[] {
  const detections: Detection[] = [];

  // Reset the regex since it has the global flag
  const regex = new RegExp(FUNCTIONAL_COMPONENT_DECL.source, FUNCTIONAL_COMPONENT_DECL.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    // Component name is in group 1 (function decl), group 2 (memo/forwardRef), or group 3 (const assignment)
    const componentName = match[1] || match[2] || match[3];
    if (!componentName) continue;

    // Find the destructured props after this match
    // Look for the opening paren + destructuring pattern starting from the match
    const afterMatch = cleaned.substring(match.index);
    const destructuredMatch = DESTRUCTURED_PROPS.exec(afterMatch);
    if (!destructuredMatch) continue;

    const propsString = destructuredMatch[1];
    const propNames = parseDestructuredProps(propsString);
    const propCount = propNames.length;

    if (propCount > threshold) {
      // Use the position in the original source for accurate line/column
      const line = getLineNumber(originalSource, match.index);
      const column = getColumnNumber(originalSource, match.index);

      detections.push({
        snifferName: 'prop-explosion',
        filePath,
        line,
        column,
        message: `Component "${componentName}" has ${propCount} props (threshold: ${threshold})`,
        severity,
        suggestion: buildSuggestion(componentName),
        details: {
          componentName,
          propCount,
          propNames,
          threshold,
        },
      });
    }
  }

  return detections;
}

const propExplosionSniffer: SnifferExport = {
  name: 'prop-explosion',
  description:
    'Detects React components that receive too many props, suggesting they should be refactored into smaller components or use composition patterns.',
  meta: {
    name: 'prop-explosion',
    description:
      'Detects React components that receive too many props, suggesting they should be refactored into smaller components or use composition patterns.',
    category: 'props',
    severity: 'warning',
    defaultConfig: {
      threshold: 10,
      severity: 'warning',
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const threshold =
      typeof config.threshold === 'number' ? config.threshold : 10;
    const severity: Severity =
      (config.severity as Severity) || 'warning';

    // Strip comments and strings so we don't get false positives
    const cleaned = stripCommentsAndStrings(fileContent);

    return detectDestructuredProps(
      cleaned,
      fileContent,
      filePath,
      threshold,
      severity,
    );
  },
};

export default propExplosionSniffer;
