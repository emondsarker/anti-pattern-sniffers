import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import { ASYNC_HANDLER, ERROR_MIDDLEWARE } from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
  extractBracedBlock,
  countMatches,
} from '../shared/regex-helpers.js';

const TRY_CATCH = /\btry\s*\{/;

const sniffer: SnifferExport = {
  name: 'missing-error-handling',
  description:
    'Detects async route handlers that lack try-catch blocks and have no centralized error middleware in the file',
  meta: {
    name: 'missing-error-handling',
    description:
      'Detects async route handlers that lack try-catch blocks and have no centralized error middleware in the file',
    framework: 'express',
    category: 'routing',
    severity: 'warning',
    defaultConfig: {},
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const severity: Severity =
      (config.severity as Severity) || 'warning';

    const cleaned = stripCommentsAndStrings(fileContent);

    // Check if file has any error middleware (centralized handler)
    const hasErrorMiddleware = countMatches(cleaned, ERROR_MIDDLEWARE) > 0;

    const detections: Detection[] = [];
    const regex = new RegExp(ASYNC_HANDLER.source, ASYNC_HANDLER.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cleaned)) !== null) {
      // Find the opening brace of the async handler body
      const searchStart = match.index + match[0].length;
      let braceIndex = -1;
      for (let i = searchStart; i < cleaned.length; i++) {
        if (cleaned[i] === '{') {
          braceIndex = i;
          break;
        }
        // Stop if we hit something unexpected
        if (cleaned[i] === ';') break;
      }

      if (braceIndex === -1) continue;

      const body = extractBracedBlock(cleaned, braceIndex);
      if (!body) continue;

      const hasTryCatch = TRY_CATCH.test(body);

      if (!hasTryCatch && !hasErrorMiddleware) {
        const httpMethod = match[1];
        const line = getLineNumber(fileContent, match.index);
        const column = getColumnNumber(fileContent, match.index);

        detections.push({
          snifferName: 'missing-error-handling',
          filePath,
          line,
          column,
          message: `Async ${httpMethod.toUpperCase()} handler has no try-catch block and no error middleware found in file`,
          severity,
          suggestion:
            '**Add error handling to async route handlers:**\n' +
            '- Wrap the handler body in a try-catch block\n' +
            '- Or add centralized error middleware: `app.use((err, req, res, next) => { ... })`\n' +
            '- Or use a wrapper like `express-async-errors` or a custom `asyncHandler` utility',
        });
      }
    }

    return detections;
  },
};

export default sniffer;
