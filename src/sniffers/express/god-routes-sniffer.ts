import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import { ROUTE_HANDLER } from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
  countMatches,
} from '../shared/regex-helpers.js';

const sniffer: SnifferExport = {
  name: 'god-routes',
  description: 'Detects route files with too many route handlers',
  meta: {
    name: 'god-routes',
    description: 'Detects route files with too many route handlers',
    framework: 'express',
    category: 'routing',
    severity: 'warning',
    defaultConfig: {
      maxRoutes: 10,
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    const maxRoutes =
      typeof config.maxRoutes === 'number' ? config.maxRoutes : 10;
    const severity: Severity =
      (config.severity as Severity) || 'warning';

    const cleaned = stripCommentsAndStrings(fileContent);
    const routeCount = countMatches(cleaned, ROUTE_HANDLER);

    if (routeCount <= maxRoutes) return [];

    // Find the first route handler to anchor the detection
    const regex = new RegExp(ROUTE_HANDLER.source, ROUTE_HANDLER.flags);
    const firstMatch = regex.exec(cleaned);
    const line = firstMatch ? getLineNumber(fileContent, firstMatch.index) : 1;
    const column = firstMatch ? getColumnNumber(fileContent, firstMatch.index) : 1;

    return [
      {
        snifferName: 'god-routes',
        filePath,
        line,
        column,
        message: `File defines ${routeCount} route handlers (threshold: ${maxRoutes}). Consider splitting into separate route files by domain.`,
        severity,
        suggestion:
          '**Split routes by domain/resource:**\n' +
          '- Create separate route files (e.g., `users.routes.ts`, `orders.routes.ts`)\n' +
          '- Use `express.Router()` to group related routes\n' +
          '- Mount sub-routers in the main app: `app.use(\'/users\', usersRouter)`',
        details: {
          routeCount,
          maxRoutes,
        },
      },
    ];
  },
};

export default sniffer;
