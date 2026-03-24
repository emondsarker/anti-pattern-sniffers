import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import {
  REQ_BODY_ACCESS,
  REQ_PARAMS_ACCESS,
  REQ_QUERY_ACCESS,
  VALIDATION_IMPORT,
} from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
} from '../shared/regex-helpers.js';

const sniffer: SnifferExport = {
  name: 'no-input-validation',
  description:
    'Detects files that access request input (body, params, query) without importing a validation library',
  meta: {
    name: 'no-input-validation',
    description:
      'Detects files that access request input (body, params, query) without importing a validation library',
    framework: 'express',
    category: 'validation',
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

    // Check if file imports a validation library
    if (VALIDATION_IMPORT.test(cleaned)) return [];

    const detections: Detection[] = [];

    const patterns: Array<{ regex: RegExp; source: string }> = [
      { regex: REQ_BODY_ACCESS, source: 'req.body' },
      { regex: REQ_PARAMS_ACCESS, source: 'req.params' },
      { regex: REQ_QUERY_ACCESS, source: 'req.query' },
    ];

    for (const { regex, source } of patterns) {
      const re = new RegExp(regex.source, regex.flags);
      let match: RegExpExecArray | null;

      while ((match = re.exec(cleaned)) !== null) {
        const line = getLineNumber(fileContent, match.index);
        const column = getColumnNumber(fileContent, match.index);

        detections.push({
          snifferName: 'no-input-validation',
          filePath,
          line,
          column,
          message: `Accessing ${source} without a validation library imported`,
          severity,
          suggestion:
            '**Add input validation:**\n' +
            '- Use `express-validator` for route-level validation middleware\n' +
            '- Use `zod` or `joi` to define schemas and validate request data\n' +
            '- Validate and sanitize all user input before processing\n' +
            '- Never trust `req.body`, `req.params`, or `req.query` without validation',
        });
      }
    }

    return detections;
  },
};

export default sniffer;
