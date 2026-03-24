import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import {
  CONTROLLER_CLASS,
  ROUTE_DECORATOR,
  USE_GUARDS,
  SENSITIVE_ROUTE_KEYWORDS,
} from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
} from '../shared/regex-helpers.js';

const sniffer: SnifferExport = {
  name: 'missing-guards',
  description: 'Detects NestJS routes handling sensitive resources without @UseGuards protection',
  meta: {
    name: 'missing-guards',
    description: 'Detects NestJS routes handling sensitive resources without @UseGuards protection',
    framework: 'nestjs',
    category: 'architecture',
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
    const detections: Detection[] = [];

    // Check if this file contains a @Controller class
    const controllerRegex = new RegExp(CONTROLLER_CLASS.source, CONTROLLER_CLASS.flags);
    const controllerMatch = controllerRegex.exec(cleaned);
    if (!controllerMatch) return [];

    const controllerPath = controllerMatch[1];
    const controllerName = controllerMatch[2];

    // Check for class-level @UseGuards
    // Look for @UseGuards before the @Controller decorator or between @Controller and class body
    const beforeController = cleaned.substring(0, controllerMatch.index);
    const classLevelGuardRegex = new RegExp(USE_GUARDS.source, USE_GUARDS.flags);
    const hasClassLevelGuard = classLevelGuardRegex.test(beforeController) ||
      classLevelGuardRegex.test(cleaned.substring(controllerMatch.index, cleaned.indexOf('{', controllerMatch.index)));

    // If controller has class-level guard, all routes are protected
    if (hasClassLevelGuard) return [];

    // Find all route handler methods and check for method-level guards
    const routeRegex = new RegExp(ROUTE_DECORATOR.source, ROUTE_DECORATOR.flags);
    let routeMatch: RegExpExecArray | null;

    while ((routeMatch = routeRegex.exec(cleaned)) !== null) {
      const httpMethod = routeMatch[1];
      const decoratorIndex = routeMatch.index;

      // Get the decorator and its arguments to find route path
      let endParen = decoratorIndex + routeMatch[0].length;
      let parenDepth = 1;
      while (endParen < cleaned.length && parenDepth > 0) {
        if (cleaned[endParen] === '(') parenDepth++;
        if (cleaned[endParen] === ')') parenDepth--;
        endParen++;
      }

      const decoratorContent = cleaned.substring(decoratorIndex, endParen);
      // Extract route path from decorator arguments
      const pathMatch = /@\w+\s*\(\s*['"]([^'"]*)['"]\s*\)/.exec(decoratorContent);
      const routePath = pathMatch ? pathMatch[1] : '';

      // Combine controller path and route path for sensitivity check
      const fullPath = `${controllerPath}/${routePath}`;

      // Only flag routes with sensitive keywords
      if (!SENSITIVE_ROUTE_KEYWORDS.test(fullPath) && !SENSITIVE_ROUTE_KEYWORDS.test(controllerName)) {
        continue;
      }

      // Check for method-level @UseGuards in the region before this decorator
      // Look backwards from the route decorator to find preceding decorators
      const lookbackStart = Math.max(0, decoratorIndex - 200);
      const precedingRegion = cleaned.substring(lookbackStart, decoratorIndex);

      // Check if @UseGuards appears as a preceding decorator for this method
      const guardRegex = new RegExp(USE_GUARDS.source, USE_GUARDS.flags);
      const hasMethodGuard = guardRegex.test(precedingRegion);

      if (!hasMethodGuard) {
        // Extract method name
        let searchStart = endParen;
        const nextBrace = cleaned.indexOf('{', searchStart);
        const signatureRegion = nextBrace !== -1 ? cleaned.substring(searchStart, nextBrace) : '';
        const methodNameMatch = /(?:async\s+)?(\w+)\s*\(/.exec(signatureRegion);
        const methodName = methodNameMatch ? methodNameMatch[1] : 'unknown';

        const line = getLineNumber(fileContent, decoratorIndex);
        const column = getColumnNumber(fileContent, decoratorIndex);

        detections.push({
          snifferName: 'missing-guards',
          filePath,
          line,
          column,
          message: `@${httpMethod}() handler "${methodName}" on sensitive path "${fullPath}" has no @UseGuards protection.`,
          severity,
          suggestion:
            '**Add authentication/authorization guards:**\n' +
            '- Method level: `@UseGuards(AuthGuard) @' + httpMethod + '()` on the handler\n' +
            '- Class level: `@UseGuards(AuthGuard) @Controller()` to protect all routes\n' +
            '- Create custom guards for fine-grained access control:\n' +
            '  `@Injectable() class RolesGuard implements CanActivate { ... }`',
          details: {
            controllerName,
            controllerPath,
            routePath,
            fullPath,
            httpMethod,
            methodName,
          },
        });
      }
    }

    return detections;
  },
};

export default sniffer;
