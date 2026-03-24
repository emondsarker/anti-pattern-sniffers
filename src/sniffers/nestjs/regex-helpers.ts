/**
 * NestJS-specific regex patterns for controller, service, and decorator detection.
 */

// @Injectable() class — Group 1: class name
export const INJECTABLE_CLASS = /@Injectable\s*\(\s*\)\s*(?:export\s+)?class\s+(\w+)/g;

// @Controller() decorator — Group 1: route path, Group 2: class name
export const CONTROLLER_CLASS = /@Controller\s*\(\s*['"]?([^'")\s]*)['"]?\s*\)\s*(?:export\s+)?class\s+(\w+)/g;

// Route method decorators — Group 1: HTTP method
export const ROUTE_DECORATOR = /@(Get|Post|Put|Patch|Delete|All|Head|Options)\s*\(/g;

// Parameter decorators with type — Group 1: param name var, Group 2: type
export const BODY_DECORATOR = /@Body\s*\([^)]*\)\s*(\w+)\s*(?::\s*(\w+))?/g;
export const PARAM_DECORATOR = /@Param\s*\([^)]*\)\s*(\w+)\s*(?::\s*(\w+))?/g;
export const QUERY_DECORATOR = /@Query\s*\([^)]*\)\s*(\w+)\s*(?::\s*(\w+))?/g;

// @UseGuards decorator
export const USE_GUARDS = /@UseGuards\s*\(/g;

// Constructor injection — captures full param list
export const CONSTRUCTOR_PARAMS = /constructor\s*\(([^)]*)\)/;

// class-validator decorators
export const CLASS_VALIDATOR_DECORATORS = /@(IsString|IsNumber|IsEmail|IsNotEmpty|MinLength|MaxLength|IsOptional|ValidateNested|IsArray|IsBoolean|IsDate|IsEnum|IsInt|IsPositive|Min|Max|Matches|IsUUID)\s*\(/g;

// Sensitive route path keywords
export const SENSITIVE_ROUTE_KEYWORDS = /admin|auth|login|password|account|settings|dashboard|user|token|secret/i;
