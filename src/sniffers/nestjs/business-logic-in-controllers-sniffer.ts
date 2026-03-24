import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import { CONTROLLER_CLASS, ROUTE_DECORATOR } from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
  findOpeningBrace,
  extractBracedBlock,
} from '../shared/regex-helpers.js';

const BUSINESS_LOGIC_PATTERNS = [
  /\.reduce\s*\(/,
  /\.map\s*\(/,
  /\.filter\s*\(/,
  /\.forEach\s*\(/,
  /calculate/i,
  /compute/i,
  /Math\./,
  /for\s*\(/,
  /while\s*\(/,
];

const sniffer: SnifferExport = {
  name: 'business-logic-in-controllers',
  description: 'Detects business logic placed directly in NestJS controller methods instead of services',
  meta: {
    name: 'business-logic-in-controllers',
    description: 'Detects business logic placed directly in NestJS controller methods instead of services',
    framework: 'nestjs',
    category: 'architecture',
    severity: 'warning',
    defaultConfig: {
      maxMethodLines: 50,
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const maxMethodLines =
      typeof config.maxMethodLines === 'number' ? config.maxMethodLines : 50;
    const severity: Severity =
      (config.severity as Severity) || 'warning';

    const cleaned = stripCommentsAndStrings(fileContent);
    const detections: Detection[] = [];

    // Check if this file contains a @Controller class
    const controllerRegex = new RegExp(CONTROLLER_CLASS.source, CONTROLLER_CLASS.flags);
    const controllerMatch = controllerRegex.exec(cleaned);
    if (!controllerMatch) return [];

    // Find all route handler methods
    // Strategy: find @Get/@Post/etc decorators and extract the method that follows
    const routeRegex = new RegExp(ROUTE_DECORATOR.source, ROUTE_DECORATOR.flags);
    let routeMatch: RegExpExecArray | null;

    while ((routeMatch = routeRegex.exec(cleaned)) !== null) {
      const httpMethod = routeMatch[1];
      const decoratorIndex = routeMatch.index;

      // Find the method body — look for the opening brace after the decorator
      // Skip past the decorator arguments first
      let searchStart = decoratorIndex + routeMatch[0].length;
      // Skip past decorator arguments and any other decorators
      let parenDepth = 1;
      while (searchStart < cleaned.length && parenDepth > 0) {
        if (cleaned[searchStart] === '(') parenDepth++;
        if (cleaned[searchStart] === ')') parenDepth--;
        searchStart++;
      }

      // Now find the method signature — look for next function-like pattern followed by {
      const braceIndex = findOpeningBrace(cleaned, searchStart);
      if (braceIndex === -1) continue;

      const methodBody = extractBracedBlock(cleaned, braceIndex);
      if (!methodBody) continue;

      const methodLines = methodBody.split('\n').length;
      const foundKeywords: string[] = [];

      for (const pattern of BUSINESS_LOGIC_PATTERNS) {
        if (pattern.test(methodBody)) {
          foundKeywords.push(pattern.source.replace(/\\/g, '').replace(/\s*\\\(/g, '(').replace(/\(\?:/, ''));
        }
      }

      const issues: string[] = [];
      if (methodLines > maxMethodLines) {
        issues.push(`${methodLines} lines (threshold: ${maxMethodLines})`);
      }
      if (foundKeywords.length > 0) {
        issues.push(`business logic patterns detected: ${foundKeywords.join(', ')}`);
      }

      if (issues.length === 0) continue;

      // Extract the method name from between the decorator end and the brace
      const signatureRegion = cleaned.substring(searchStart, braceIndex);
      const methodNameMatch = /(?:async\s+)?(\w+)\s*\(/.exec(signatureRegion);
      const methodName = methodNameMatch ? methodNameMatch[1] : 'unknown';

      const line = getLineNumber(fileContent, decoratorIndex);
      const column = getColumnNumber(fileContent, decoratorIndex);

      detections.push({
        snifferName: 'business-logic-in-controllers',
        filePath,
        line,
        column,
        message: `@${httpMethod}() handler "${methodName}" contains ${issues.join(' and ')}. Move logic to a service.`,
        severity,
        suggestion:
          '**Move business logic to a dedicated service:**\n' +
          '- Controllers should only handle HTTP concerns (parsing input, returning responses)\n' +
          '- Create or use an existing service: `this.myService.processData(dto)`\n' +
          '- Keep controller methods thin — delegate computation, filtering, and data transformation\n' +
          '- This improves testability and separation of concerns',
        details: {
          httpMethod,
          methodName,
          methodLines,
          maxMethodLines,
          businessLogicKeywords: foundKeywords,
        },
      });
    }

    return detections;
  },
};

export default sniffer;
