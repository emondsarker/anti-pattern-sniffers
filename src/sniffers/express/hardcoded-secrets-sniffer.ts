import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import {
  AWS_ACCESS_KEY,
  HARDCODED_SECRET,
  CONNECTION_STRING_WITH_CREDS,
} from './regex-helpers.js';
import {
  getLineNumber,
  getColumnNumber,
} from '../shared/regex-helpers.js';

const sniffer: SnifferExport = {
  name: 'hardcoded-secrets',
  description:
    'Detects hardcoded secrets such as API keys, passwords, and connection strings with credentials',
  meta: {
    name: 'hardcoded-secrets',
    description:
      'Detects hardcoded secrets such as API keys, passwords, and connection strings with credentials',
    framework: 'generic',
    category: 'security',
    severity: 'error',
    defaultConfig: {},
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const severity: Severity =
      (config.severity as Severity) || 'error';

    // Do NOT strip comments or strings -- we need to inspect raw string content.
    // Secrets in comments are still a problem.
    const detections: Detection[] = [];

    const patterns: Array<{ regex: RegExp; label: string }> = [
      { regex: AWS_ACCESS_KEY, label: 'AWS access key' },
      { regex: HARDCODED_SECRET, label: 'Hardcoded secret' },
      { regex: CONNECTION_STRING_WITH_CREDS, label: 'Connection string with embedded credentials' },
    ];

    for (const { regex, label } of patterns) {
      const re = new RegExp(regex.source, regex.flags);
      let match: RegExpExecArray | null;

      while ((match = re.exec(fileContent)) !== null) {
        const line = getLineNumber(fileContent, match.index);
        const column = getColumnNumber(fileContent, match.index);

        detections.push({
          snifferName: 'hardcoded-secrets',
          filePath,
          line,
          column,
          message: `${label} detected`,
          severity,
          suggestion:
            '**Use environment variables or a secret manager:**\n' +
            '- Store secrets in environment variables (`process.env.SECRET`)\n' +
            '- Use a `.env` file with `dotenv` (never commit `.env` to version control)\n' +
            '- Use a secret management service (AWS Secrets Manager, HashiCorp Vault, etc.)\n' +
            '- Add secret patterns to `.gitignore` and use pre-commit hooks to prevent leaks',
        });
      }
    }

    return detections;
  },
};

export default sniffer;
