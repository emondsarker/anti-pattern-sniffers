/**
 * Backward-compatible re-export facade.
 * All existing imports from this path continue to work.
 * New code should import from the specific module:
 *   - '../sniffers/shared/regex-helpers.js' for generic utilities
 *   - '../sniffers/react/regex-helpers.js' for React patterns
 */
export * from '../sniffers/shared/regex-helpers.js';
export * from '../sniffers/react/regex-helpers.js';
