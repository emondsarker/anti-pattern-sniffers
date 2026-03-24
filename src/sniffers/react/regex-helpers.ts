/**
 * React-specific regex patterns for JSX, hooks, and component detection.
 */

// Matches functional component declarations (PascalCase)
export const FUNCTIONAL_COMPONENT_DECL =
  /(?:function\s+([A-Z][a-zA-Z0-9]*)\s*\(|(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*(?::[^=\n]*)?\s*=\s*(?:React\.)?(?:memo|forwardRef)\s*\(\s*(?:function\s*\w*\s*)?\(|(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*(?::[^=\n]*)?\s*=\s*(?:function\s*\w*\s*)?\()/g;

// Matches destructured props in function parameters: ({ a, b, c })
export const DESTRUCTURED_PROPS = /\(\s*\{([^}]*)\}/;

// Matches a JSX opening tag with PascalCase name
export const JSX_OPENING_TAG = /<([A-Z][a-zA-Z0-9.]*)(\s[^>]*?)?\s*(?:\/>|>)/g;

// Matches an individual JSX attribute (not spread)
export const JSX_ATTRIBUTE = /(?:^|\s)([a-zA-Z][\w-]*)(?:\s*=\s*(?:\{[^}]*\}|"[^"]*"|'[^']*'|[^\s/>]*)|\s*(?=[/>\s]))/g;

// Matches JSX spread attribute: {...expr}
export const JSX_SPREAD = /\{\s*\.\.\.(\w+)\s*\}/g;

// Matches custom hook declarations
export const CUSTOM_HOOK_DECL =
  /(?:function\s+(use[A-Z]\w*)\s*\(|(?:const|let|var)\s+(use[A-Z]\w*)\s*=)/g;

// Hook call patterns
export const USE_STATE = /\buseState\s*(?:<[^>]*>)?\s*\(/g;
export const USE_EFFECT = /\buseEffect\s*\(/g;
export const USE_CALLBACK = /\buseCallback\s*\(/g;
export const USE_MEMO = /\buseMemo\s*\(/g;
export const USE_REF = /\buseRef\s*(?:<[^>]*>)?\s*\(/g;
export const USE_CONTEXT = /\buseContext\s*\(/g;
export const USE_REDUCER = /\buseReducer\s*\(/g;
export const USE_LAYOUT_EFFECT = /\buseLayoutEffect\s*\(/g;
