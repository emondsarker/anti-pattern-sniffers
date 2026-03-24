import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
} from '../shared/regex-helpers.js';

/**
 * Track nesting depth of callback patterns and flag locations where
 * the depth exceeds the configured threshold.
 *
 * We iterate character-by-character (similar to extractBracedBlock) to
 * accurately track brace nesting depth while skipping strings and comments.
 */
function findDeepCallbacks(
  cleaned: string,
  originalSource: string,
  filePath: string,
  maxDepth: number,
  severity: Severity,
): Detection[] {
  const detections: Detection[] = [];
  const flaggedLines = new Set<number>();

  // Detect callback-style patterns: `=> {` or `function(...) {`
  // We look for `=> {` or `) {` preceded by a function keyword or arrow context.
  const CALLBACK_OPEN = /(?:=>\s*\{|function\s*(?:\w*)\s*\([^)]*\)\s*\{)/g;

  // Find all callback opening positions
  const callbackPositions: number[] = [];
  let cbMatch: RegExpExecArray | null;
  while ((cbMatch = CALLBACK_OPEN.exec(cleaned)) !== null) {
    // The brace is at the end of the match
    const bracePos = cbMatch.index + cbMatch[0].length - 1;
    callbackPositions.push(bracePos);
  }

  if (callbackPositions.length === 0) return detections;

  const callbackSet = new Set(callbackPositions);

  // Now iterate through the source tracking brace depth,
  // but only count depth increases that correspond to callback openings
  let callbackDepth = 0;
  const depthStack: boolean[] = []; // tracks whether each '{' is a callback brace

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (ch === '{') {
      const isCallback = callbackSet.has(i);
      depthStack.push(isCallback);
      if (isCallback) {
        callbackDepth++;
        if (callbackDepth > maxDepth) {
          const line = getLineNumber(originalSource, i);
          if (!flaggedLines.has(line)) {
            flaggedLines.add(line);
            const column = getColumnNumber(originalSource, i);
            detections.push({
              snifferName: 'callback-hell',
              filePath,
              line,
              column,
              message: `Callback nesting depth is ${callbackDepth} (threshold: ${maxDepth})`,
              severity,
              suggestion:
                '**Reduce callback nesting:**\n' +
                '- Convert nested callbacks to async/await\n' +
                '- Extract inner callbacks into named functions\n' +
                '- Use Promise.all() for parallel async operations\n' +
                '- Consider using a control flow library if callbacks are unavoidable',
              details: {
                depth: callbackDepth,
                maxDepth,
              },
            });
          }
        }
      }
    } else if (ch === '}') {
      if (depthStack.length > 0) {
        const wasCallback = depthStack.pop();
        if (wasCallback) callbackDepth--;
      }
    }
  }

  return detections;
}

const sniffer: SnifferExport = {
  name: 'callback-hell',
  description:
    'Detects deeply nested callback patterns that indicate callback hell',
  meta: {
    name: 'callback-hell',
    description:
      'Detects deeply nested callback patterns that indicate callback hell',
    framework: 'express',
    category: 'architecture',
    severity: 'warning',
    defaultConfig: {
      maxDepth: 3,
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const maxDepth =
      typeof config.maxDepth === 'number' ? config.maxDepth : 3;
    const severity: Severity =
      (config.severity as Severity) || 'warning';

    const cleaned = stripCommentsAndStrings(fileContent);

    return findDeepCallbacks(cleaned, fileContent, filePath, maxDepth, severity);
  },
};

export default sniffer;
