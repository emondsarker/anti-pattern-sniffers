import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import {
  BODY_DECORATOR,
  PARAM_DECORATOR,
  QUERY_DECORATOR,
  CLASS_VALIDATOR_DECORATORS,
} from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
  countMatches,
} from '../shared/regex-helpers.js';

const sniffer: SnifferExport = {
  name: 'missing-dtos',
  description: 'Detects untyped request parameters and DTO classes without validation decorators',
  meta: {
    name: 'missing-dtos',
    description: 'Detects untyped request parameters and DTO classes without validation decorators',
    framework: 'nestjs',
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
    const detections: Detection[] = [];

    // Check @Body(), @Param(), @Query() decorators for missing or 'any' types
    const decoratorPatterns: Array<{ regex: RegExp; label: string }> = [
      { regex: new RegExp(BODY_DECORATOR.source, BODY_DECORATOR.flags), label: '@Body()' },
      { regex: new RegExp(PARAM_DECORATOR.source, PARAM_DECORATOR.flags), label: '@Param()' },
      { regex: new RegExp(QUERY_DECORATOR.source, QUERY_DECORATOR.flags), label: '@Query()' },
    ];

    for (const { regex, label } of decoratorPatterns) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(cleaned)) !== null) {
        const paramName = match[1];
        const typeName = match[2];

        if (!typeName || typeName === 'any') {
          const line = getLineNumber(fileContent, match.index);
          const column = getColumnNumber(fileContent, match.index);

          detections.push({
            snifferName: 'missing-dtos',
            filePath,
            line,
            column,
            message: `Parameter "${paramName}" with ${label} ${!typeName ? 'has no type annotation' : 'is typed as "any"'}. Use a properly typed DTO class.`,
            severity,
            suggestion:
              '**Create a typed DTO with class-validator decorators:**\n' +
              '```typescript\n' +
              'class CreateUserDto {\n' +
              '  @IsString()\n' +
              '  @IsNotEmpty()\n' +
              '  name: string;\n' +
              '\n' +
              '  @IsEmail()\n' +
              '  email: string;\n' +
              '}\n' +
              '```\n' +
              '- Install: `npm i class-validator class-transformer`\n' +
              '- Enable `ValidationPipe` globally in `main.ts`',
            details: {
              paramName,
              decorator: label,
              typeName: typeName || null,
            },
          });
        }
      }
    }

    // Check for DTO classes without class-validator decorators
    const dtoClassRegex = /(?:export\s+)?class\s+(\w+(?:Dto|DTO))\s*(?:extends\s+\w+\s*)?\{/g;
    let dtoMatch: RegExpExecArray | null;

    while ((dtoMatch = dtoClassRegex.exec(cleaned)) !== null) {
      const dtoName = dtoMatch[1];
      const dtoStart = dtoMatch.index;

      // Find the class body boundaries
      const braceStart = cleaned.indexOf('{', dtoStart + dtoMatch[0].length - 1);
      if (braceStart === -1) continue;

      // Find matching close brace (simple depth counting)
      let depth = 1;
      let braceEnd = braceStart + 1;
      while (braceEnd < cleaned.length && depth > 0) {
        if (cleaned[braceEnd] === '{') depth++;
        if (cleaned[braceEnd] === '}') depth--;
        braceEnd++;
      }

      const dtoBody = cleaned.substring(braceStart, braceEnd);
      const validatorCount = countMatches(dtoBody, CLASS_VALIDATOR_DECORATORS);

      if (validatorCount === 0) {
        const line = getLineNumber(fileContent, dtoStart);
        const column = getColumnNumber(fileContent, dtoStart);

        detections.push({
          snifferName: 'missing-dtos',
          filePath,
          line,
          column,
          message: `DTO class "${dtoName}" has no class-validator decorators. Add validation decorators to enforce input constraints.`,
          severity,
          suggestion:
            '**Add class-validator decorators to DTO properties:**\n' +
            '- `@IsString()`, `@IsNumber()`, `@IsEmail()` for type checks\n' +
            '- `@IsNotEmpty()`, `@MinLength()`, `@MaxLength()` for constraints\n' +
            '- `@IsOptional()` for optional fields\n' +
            '- `@ValidateNested()` with `@Type()` for nested objects',
          details: {
            className: dtoName,
          },
        });
      }
    }

    return detections;
  },
};

export default sniffer;
