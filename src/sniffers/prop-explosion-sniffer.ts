import type { Detection, SnifferExport, Severity } from './sniffer-interface.js';
import {
  FUNCTIONAL_COMPONENT_DECL,
  DESTRUCTURED_PROPS,
  JSX_OPENING_TAG,
  JSX_ATTRIBUTE,
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
  parseDestructuredProps,
} from '../utils/regex-helpers.js';

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

/**
 * Detect JSX usage sites where a PascalCase component receives too many attributes.
 *
 * Counts non-spread attributes on JSX opening tags. Spread attributes are excluded
 * because they represent an unknown number of props.
 */
function detectJsxAttributeExplosion(
  cleaned: string,
  originalSource: string,
  filePath: string,
  threshold: number,
  severity: Severity,
): Detection[] {
  const detections: Detection[] = [];

  const jsxRegex = new RegExp(JSX_OPENING_TAG.source, JSX_OPENING_TAG.flags);
  let match: RegExpExecArray | null;

  while ((match = jsxRegex.exec(cleaned)) !== null) {
    const componentName = match[1];
    const attributesText = match[2];

    // Only look at PascalCase component names (skip HTML elements)
    if (!componentName || !/^[A-Z]/.test(componentName)) continue;

    // Skip self-referencing / no attributes
    if (!attributesText || !attributesText.trim()) continue;

    // Count non-spread attributes
    const attrRegex = new RegExp(JSX_ATTRIBUTE.source, JSX_ATTRIBUTE.flags);
    const propNames: string[] = [];
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attributesText)) !== null) {
      if (attrMatch[1]) {
        propNames.push(attrMatch[1]);
      }
    }

    const propCount = propNames.length;

    if (propCount > threshold) {
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
      threshold: 7,
      severity: 'warning',
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const threshold =
      typeof config.threshold === 'number' ? config.threshold : 7;
    const severity: Severity =
      (config.severity as Severity) || 'warning';

    // Strip comments and strings so we don't get false positives
    const cleaned = stripCommentsAndStrings(fileContent);

    const declarationDetections = detectDestructuredProps(
      cleaned,
      fileContent,
      filePath,
      threshold,
      severity,
    );

    const jsxDetections = detectJsxAttributeExplosion(
      cleaned,
      fileContent,
      filePath,
      threshold,
      severity,
    );

    return [...declarationDetections, ...jsxDetections];
  },
};

export default propExplosionSniffer;
