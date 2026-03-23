import type { Detection, SnifferExport, Severity } from './sniffer-interface.js';
import {
  FUNCTIONAL_COMPONENT_DECL,
  DESTRUCTURED_PROPS,
  extractBracedBlock,
  stripCommentsAndStrings,
  getLineNumber,
  parseDestructuredProps,
  findOpeningBrace,
} from '../utils/regex-helpers.js';

const DEFAULT_WHITELISTED_PROPS = [
  'className',
  'style',
  'children',
  'key',
  'ref',
  'id',
  'data-testid',
];

/**
 * Build a suggestion message for a prop-drilling detection.
 */
function buildSuggestion(componentName: string, propName: string): string {
  return (
    `**Possible prop drilling in \`${componentName}\`:**\n` +
    `- Use React Context to provide \`${propName}\` to deeper components\n` +
    '- Use component composition (children/render props)\n' +
    '- Consider a state management solution'
  );
}

/**
 * Count how many times a prop name appears as a JSX pass-through pattern
 * in the given stripped source. A pass-through pattern is:
 *   propName={propName}
 * inside a PascalCase JSX element (child component).
 */
function countPassThroughOccurrences(strippedBody: string, propName: string): number {
  // Match patterns like: propName={propName} inside JSX of a child component.
  // The propName on the left is the JSX attribute, the one on the right is the value.
  // We need word boundaries to avoid partial matches.
  const pattern = new RegExp(
    `\\b${escapeRegex(propName)}\\s*=\\s*\\{\\s*${escapeRegex(propName)}\\s*\\}`,
    'g',
  );
  const matches = strippedBody.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Count all occurrences of a prop name as a standalone identifier
 * (word boundary on both sides) in the stripped body.
 * Excludes the destructured parameter declaration itself.
 */
function countAllOccurrences(strippedBody: string, propName: string): number {
  const pattern = new RegExp(`\\b${escapeRegex(propName)}\\b`, 'g');
  const matches = strippedBody.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect props that are received by a component via destructuring
 * and only forwarded to child components without any local usage.
 */
function detectPassThroughProps(
  fileContent: string,
  filePath: string,
  whitelistedProps: string[],
  severity: Severity,
): Detection[] {
  const detections: Detection[] = [];
  const whitelistSet = new Set(whitelistedProps);

  // Work on the original source for position tracking, but use stripped for analysis
  const regex = new RegExp(FUNCTIONAL_COMPONENT_DECL.source, FUNCTIONAL_COMPONENT_DECL.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(fileContent)) !== null) {
    const componentName = match[1] || match[2] || match[3];
    if (!componentName) continue;

    // Extract destructured props from the component declaration
    const afterMatch = fileContent.substring(match.index);
    const destructuredMatch = DESTRUCTURED_PROPS.exec(afterMatch);
    if (!destructuredMatch) continue;

    const propsString = destructuredMatch[1];
    const propNames = parseDestructuredProps(propsString);
    if (propNames.length === 0) continue;

    // Find the component body (the opening brace of the function body)
    // We need to find the brace after the parameter list / arrow / return type
    const declEnd = match.index + afterMatch.indexOf(destructuredMatch[0]) + destructuredMatch[0].length;
    const braceIndex = findOpeningBrace(fileContent, declEnd);
    if (braceIndex === -1) continue;

    const body = extractBracedBlock(fileContent, braceIndex);
    if (!body) continue;

    // Strip comments and strings from the body for accurate analysis
    const strippedBody = stripCommentsAndStrings(body);

    const line = getLineNumber(fileContent, match.index);

    for (const propName of propNames) {
      // Skip whitelisted props
      if (whitelistSet.has(propName)) continue;

      // Count all identifier occurrences in the body
      const totalOccurrences = countAllOccurrences(strippedBody, propName);

      // Count pass-through occurrences (propName={propName} patterns)
      const passThroughCount = countPassThroughOccurrences(strippedBody, propName);

      // Each pass-through pattern like `propName={propName}` contains 2 occurrences
      // of the identifier: the attribute name and the value.
      const occurrencesAccountedByPassThrough = passThroughCount * 2;

      // A prop is pass-through only if:
      // 1. There is at least one pass-through usage
      // 2. All occurrences of the identifier are accounted for by pass-through patterns
      if (passThroughCount > 0 && totalOccurrences === occurrencesAccountedByPassThrough) {
        detections.push({
          snifferName: 'prop-drilling',
          filePath,
          line,
          column: 1,
          message: `Component "${componentName}" passes prop "${propName}" through without using it`,
          severity,
          suggestion: buildSuggestion(componentName, propName),
          details: {
            componentName,
            propName,
            passThroughCount,
          },
        });
      }
    }
  }

  return detections;
}

const sniffer: SnifferExport = {
  name: 'prop-drilling',
  description:
    'Detects props that are received by a component and passed through to children without local usage, indicating possible prop drilling.',
  meta: {
    name: 'prop-drilling',
    description:
      'Detects props that are received by a component and passed through to children without local usage, indicating possible prop drilling.',
    category: 'props',
    severity: 'warning',
    defaultConfig: {
      severity: 'warning',
      whitelistedProps: DEFAULT_WHITELISTED_PROPS,
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const severity: Severity = (config.severity as Severity) || 'warning';
    const whitelistedProps: string[] = Array.isArray(config.whitelistedProps)
      ? (config.whitelistedProps as string[])
      : DEFAULT_WHITELISTED_PROPS;

    return detectPassThroughProps(fileContent, filePath, whitelistedProps, severity);
  },
};

export default sniffer;
export { sniffer as propDrillingSniffer };
