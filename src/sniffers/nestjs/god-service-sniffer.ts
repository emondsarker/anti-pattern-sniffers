import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import { INJECTABLE_CLASS, CONSTRUCTOR_PARAMS } from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
  findOpeningBrace,
  extractBracedBlock,
} from '../shared/regex-helpers.js';

const sniffer: SnifferExport = {
  name: 'god-service',
  description: 'Detects NestJS injectable services that have too many dependencies or public methods',
  meta: {
    name: 'god-service',
    description: 'Detects NestJS injectable services that have too many dependencies or public methods',
    framework: 'nestjs',
    category: 'dependency-injection',
    severity: 'warning',
    defaultConfig: {
      maxDependencies: 8,
      maxPublicMethods: 15,
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const maxDependencies =
      typeof config.maxDependencies === 'number' ? config.maxDependencies : 8;
    const maxPublicMethods =
      typeof config.maxPublicMethods === 'number' ? config.maxPublicMethods : 15;
    const severity: Severity =
      (config.severity as Severity) || 'warning';

    const cleaned = stripCommentsAndStrings(fileContent);
    const detections: Detection[] = [];

    const regex = new RegExp(INJECTABLE_CLASS.source, INJECTABLE_CLASS.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cleaned)) !== null) {
      const className = match[1];
      const classStart = match.index;

      // Find the class body
      const braceIndex = findOpeningBrace(cleaned, classStart + match[0].length);
      if (braceIndex === -1) continue;

      const classBody = extractBracedBlock(cleaned, braceIndex);
      if (!classBody) continue;

      // Count constructor dependencies
      const ctorMatch = CONSTRUCTOR_PARAMS.exec(classBody);
      let depCount = 0;
      if (ctorMatch && ctorMatch[1].trim().length > 0) {
        const params = ctorMatch[1].split(',');
        depCount = params.filter(p => {
          const trimmed = p.trim();
          return /(?:private|public|protected|readonly)\s/.test(trimmed);
        }).length;
      }

      // Count public methods (not constructor, not private/protected)
      const methodRegex = /(?:async\s+)?(\w+)\s*\(/g;
      let methodMatch: RegExpExecArray | null;
      let publicMethodCount = 0;

      // Remove the constructor from the body for method counting
      const bodyWithoutCtor = classBody.replace(/constructor\s*\([^)]*\)\s*\{[^}]*\}/s, '');

      while ((methodMatch = methodRegex.exec(bodyWithoutCtor)) !== null) {
        const methodName = methodMatch[1];
        // Skip keywords and common non-method identifiers
        if (['constructor', 'if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'function', 'class', 'super', 'this', 'await', 'async', 'get', 'set'].includes(methodName)) {
          continue;
        }
        // Check if preceded by private/protected
        const beforeMethod = bodyWithoutCtor.substring(Math.max(0, methodMatch.index - 30), methodMatch.index);
        if (/(?:private|protected)\s+$/.test(beforeMethod)) {
          continue;
        }
        publicMethodCount++;
      }

      const issues: string[] = [];
      if (depCount > maxDependencies) {
        issues.push(`${depCount} constructor dependencies (threshold: ${maxDependencies})`);
      }
      if (publicMethodCount > maxPublicMethods) {
        issues.push(`${publicMethodCount} public methods (threshold: ${maxPublicMethods})`);
      }

      if (issues.length === 0) continue;

      const line = getLineNumber(fileContent, classStart);
      const column = getColumnNumber(fileContent, classStart);

      detections.push({
        snifferName: 'god-service',
        filePath,
        line,
        column,
        message: `Service "${className}" has ${issues.join(' and ')}. Consider splitting into focused services.`,
        severity,
        suggestion:
          '**Split into focused services by domain:**\n' +
          '- Identify distinct responsibilities within the service\n' +
          '- Create separate services (e.g., `UserAuthService`, `UserProfileService`)\n' +
          '- Use composition: inject smaller services into orchestrating services\n' +
          '- Apply the Single Responsibility Principle',
        details: {
          className,
          dependencyCount: depCount,
          publicMethodCount,
          maxDependencies,
          maxPublicMethods,
        },
      });
    }

    return detections;
  },
};

export default sniffer;
