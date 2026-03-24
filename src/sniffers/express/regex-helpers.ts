/**
 * Express-specific regex patterns for route, middleware, and security detection.
 */

// Route handler: (app|router).(get|post|put|patch|delete|use|all)(
export const ROUTE_HANDLER = /(app|router)\.(get|post|put|patch|delete|use|all)\s*\(/g;

// Error middleware signature: (err, req, res, next)
export const ERROR_MIDDLEWARE = /\(\s*(err|error)\s*,\s*(req|request)\s*,\s*(res|response)\s*,\s*(next)\s*\)/g;

// Async route handler
export const ASYNC_HANDLER = /\.\s*(get|post|put|patch|delete)\s*\([^,]*,\s*async\s/g;

// Request input access
export const REQ_BODY_ACCESS = /req\.body(?:\.\w+|\[)/g;
export const REQ_PARAMS_ACCESS = /req\.params(?:\.\w+|\[)/g;
export const REQ_QUERY_ACCESS = /req\.query(?:\.\w+|\[)/g;

// Validation library import
export const VALIDATION_IMPORT = /require\s*\(\s*['"](?:express-validator|joi|zod|yup|celebrate|class-validator)['"]\s*\)|import\s+.*from\s+['"](?:express-validator|joi|zod|yup|celebrate|class-validator)['"]/;

// Secret patterns
export const AWS_ACCESS_KEY = /(?:['"`])?(AKIA[0-9A-Z]{16})(?:['"`])?/g;
export const HARDCODED_SECRET = /(?:password|passwd|pwd|secret|api[_-]?key|token|auth[_-]?token|private[_-]?key)\s*[:=]\s*['"][^'"]{4,}['"]/gi;
export const CONNECTION_STRING_WITH_CREDS = /(?:mongodb|mysql|postgres|postgresql|redis|amqp|rabbitmq):\/\/[^'":\s]+:[^'"@\s]+@/g;
