import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import {
  FUNCTIONAL_COMPONENT_DECL,
  DESTRUCTURED_PROPS,
} from './regex-helpers.js';
import {
  extractBracedBlock,
  stripCommentsAndStrings,
  getLineNumber,
  parseDestructuredProps,
  findOpeningBrace,
} from '../shared/regex-helpers.js';

const DEFAULT_WHITELISTED_PROPS = [
  'className',
  'style',
  'children',
  'key',
  'ref',
  'id',
  'data-testid',
  'onChange',
  'onClick',
  'onSubmit',
  'onClose',
  'onOpenChange',
  'isOpen',
  'isLoading',
  'disabled',
  'loading',
  'open',
  'visible',
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
  const pattern = new RegExp(
    `\\b${escapeRegex(propName)}\\s*=\\s*\\{\\s*${escapeRegex(propName)}\\s*\\}`,
    'g',
  );
  const matches = strippedBody.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Find which PascalCase child components receive a given pass-through prop.
 * Returns the set of distinct child component names.
 */
function findReceivingChildren(strippedBody: string, propName: string): Set<string> {
  const children = new Set<string>();
  // Find <ComponentName ... propName={propName} by scanning backwards from each
  // pass-through occurrence to find the opening JSX tag
  const passThroughPattern = new RegExp(
    `\\b${escapeRegex(propName)}\\s*=\\s*\\{\\s*${escapeRegex(propName)}\\s*\\}`,
    'g',
  );
  let match: RegExpExecArray | null;
  while ((match = passThroughPattern.exec(strippedBody)) !== null) {
    // Scan backwards to find the opening < of the JSX element
    const before = strippedBody.substring(Math.max(0, match.index - 500), match.index);
    // Find the last opening JSX tag — <ComponentName or <Namespace.ComponentName
    const tagMatch = before.match(/<([A-Z]\w*(?:\.[A-Z]\w*)*)(?:\s[^>]*)?$/);
    if (tagMatch) {
      children.add(tagMatch[1]);
    }
  }
  return children;
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
  minPassThroughProps: number,
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

    // First pass: collect all pass-through props for this component
    const passThroughProps: Array<{ propName: string; passThroughCount: number }> = [];

    for (const propName of propNames) {
      if (whitelistSet.has(propName)) continue;
      // Auto-whitelist event handler props (on[A-Z]* pattern)
      if (/^on[A-Z]/.test(propName)) continue;

      const totalOccurrences = countAllOccurrences(strippedBody, propName);
      const passThroughCount = countPassThroughOccurrences(strippedBody, propName);
      const occurrencesAccountedByPassThrough = passThroughCount * 2;

      if (passThroughCount > 0 && totalOccurrences === occurrencesAccountedByPassThrough) {
        passThroughProps.push({ propName, passThroughCount });
      }
    }

    // Only flag if the component has enough pass-through props to indicate drilling
    if (passThroughProps.length >= minPassThroughProps) {
      // Check if pass-through props are distributed across multiple distinct children.
      // If so, this is composition/distribution, not drilling.
      const allReceivingChildren = new Set<string>();
      for (const { propName } of passThroughProps) {
        const children = findReceivingChildren(strippedBody, propName);
        for (const child of children) {
          allReceivingChildren.add(child);
        }
      }

      // If props are distributed to 3+ distinct children, it's composition — skip.
      // Also check per-child concentration: if no single child receives >= minPassThroughProps
      // pass-through props, it's distribution — skip.
      if (allReceivingChildren.size >= 3) continue;
      if (allReceivingChildren.size >= 2) {
        // For 2 children: check if either child receives enough pass-through props
        // to constitute drilling (not just splitting props between two children)
        const childPropCounts = new Map<string, number>();
        for (const { propName } of passThroughProps) {
          const children = findReceivingChildren(strippedBody, propName);
          for (const child of children) {
            childPropCounts.set(child, (childPropCounts.get(child) || 0) + 1);
          }
        }
        const maxChildProps = Math.max(...childPropCounts.values());
        if (maxChildProps < minPassThroughProps) continue;
      }

      for (const { propName, passThroughCount } of passThroughProps) {
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
      minPassThroughProps: 4,
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
    const minPassThroughProps: number =
      typeof config.minPassThroughProps === 'number' ? config.minPassThroughProps : 4;

    return detectPassThroughProps(fileContent, filePath, whitelistedProps, severity, minPassThroughProps);
  },
};

export default sniffer;
export { sniffer as propDrillingSniffer };
