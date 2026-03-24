import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import { ROUTE_HANDLER } from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
  extractBracedBlock,
  countMatches,
} from '../shared/regex-helpers.js';

const AWAIT_PATTERN = /\bawait\b/g;

const sniffer: SnifferExport = {
  name: 'fat-controllers',
  description:
    'Detects route handler callbacks that are too long or perform too many async operations',
  meta: {
    name: 'fat-controllers',
    description:
      'Detects route handler callbacks that are too long or perform too many async operations',
    framework: 'express',
    category: 'architecture',
    severity: 'warning',
    defaultConfig: {
      maxLines: 50,
      maxAwaits: 3,
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const maxLines =
      typeof config.maxLines === 'number' ? config.maxLines : 50;
    const maxAwaits =
      typeof config.maxAwaits === 'number' ? config.maxAwaits : 3;
    const severity: Severity =
      (config.severity as Severity) || 'warning';

    const cleaned = stripCommentsAndStrings(fileContent);
    const detections: Detection[] = [];

    const regex = new RegExp(ROUTE_HANDLER.source, ROUTE_HANDLER.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cleaned)) !== null) {
      // Find the callback body: scan forward from the match to find the handler's opening brace
      // The handler arguments are inside parens: .get('/path', (req, res) => { ... })
      // We need to find the callback function's opening brace
      const searchStart = match.index + match[0].length;

      // Find the opening brace of the handler callback
      let braceIndex = -1;
      let parenDepth = 1; // We are already past the opening paren of .get(
      for (let i = searchStart; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (ch === '(') parenDepth++;
        if (ch === ')') {
          parenDepth--;
          if (parenDepth === 0) break; // end of .get(...) call
        }
        if (ch === '{' && parenDepth > 0) {
          braceIndex = i;
          break;
        }
      }

      if (braceIndex === -1) continue;

      const body = extractBracedBlock(cleaned, braceIndex);
      if (!body) continue;

      const lineCount = body.split('\n').length;
      const awaitCount = countMatches(body, AWAIT_PATTERN);

      const reasons: string[] = [];
      if (lineCount > maxLines) {
        reasons.push(`${lineCount} lines (threshold: ${maxLines})`);
      }
      if (awaitCount > maxAwaits) {
        reasons.push(`${awaitCount} await calls (threshold: ${maxAwaits})`);
      }

      if (reasons.length === 0) continue;

      const httpMethod = match[2];
      const line = getLineNumber(fileContent, match.index);
      const column = getColumnNumber(fileContent, match.index);

      detections.push({
        snifferName: 'fat-controllers',
        filePath,
        line,
        column,
        message: `Route handler .${httpMethod}() is too complex: ${reasons.join(', ')}`,
        severity,
        suggestion:
          '**Extract logic to a service layer:**\n' +
          '- Move business logic into separate service/use-case modules\n' +
          '- Keep route handlers thin: parse input, call service, send response\n' +
          '- Extract database queries into repository modules\n' +
          '- Use middleware for cross-cutting concerns (auth, logging, etc.)',
        details: {
          lineCount,
          awaitCount,
          maxLines,
          maxAwaits,
        },
      });
    }

    return detections;
  },
};

export default sniffer;
