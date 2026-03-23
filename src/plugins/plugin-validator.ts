import { readFileSync } from 'node:fs';
import type { SnifferExport } from '../sniffers/sniffer-interface.js';
import { REQUIRED_EXPORT_SCHEMA, REQUIRED_META_SCHEMA } from '../sniffers/sniffer-interface.js';

export function validatePluginExports(pluginModule: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (pluginModule === null || pluginModule === undefined || typeof pluginModule !== 'object') {
    errors.push('Plugin module must be a non-null object');
    return { valid: false, errors };
  }

  const mod = pluginModule as Record<string, unknown>;

  // Check each key in REQUIRED_EXPORT_SCHEMA exists and has the correct type
  for (const [key, expectedType] of Object.entries(REQUIRED_EXPORT_SCHEMA)) {
    if (!(key in mod)) {
      errors.push(`Missing required export: "${key}"`);
    } else if (typeof mod[key] !== expectedType) {
      errors.push(`Export "${key}" must be of type "${expectedType}", got "${typeof mod[key]}"`);
    } else if (key === 'name' && (mod[key] as string).trim() === '') {
      errors.push(`Export "name" must not be an empty string`);
    }
  }

  // Check meta sub-fields match REQUIRED_META_SCHEMA
  if ('meta' in mod && typeof mod.meta === 'object' && mod.meta !== null) {
    const meta = mod.meta as Record<string, unknown>;
    for (const [key, expectedType] of Object.entries(REQUIRED_META_SCHEMA)) {
      if (!(key in meta)) {
        errors.push(`Missing required meta field: "${key}"`);
      } else if (typeof meta[key] !== expectedType) {
        errors.push(`Meta field "${key}" must be of type "${expectedType}", got "${typeof meta[key]}"`);
      }
    }
  }

  // Check detect function has .length >= 2 (at least fileContent, filePath params)
  if ('detect' in mod && typeof mod.detect === 'function') {
    if (mod.detect.length < 2) {
      errors.push(`detect function must accept at least 2 parameters (fileContent, filePath), got ${mod.detect.length}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validatePluginSecurity(pluginPath: string): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];

  let source: string;
  try {
    source = readFileSync(pluginPath, 'utf-8');
  } catch {
    warnings.push(`Could not read plugin file: ${pluginPath}`);
    return { safe: false, warnings };
  }

  const dangerousPatterns: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\beval\s*\(/, reason: 'dangerous code execution (eval)' },
    { pattern: /\bnew\s+Function\s*\(/, reason: 'dynamic code creation (new Function)' },
    { pattern: /\bFunction\s*\(/, reason: 'dynamic code creation (Function)' },
    { pattern: /require\s*\(\s*['"`]child_process['"`]\s*\)/, reason: 'process spawning (child_process)' },
    { pattern: /require\s*\(\s*['"`]net['"`]\s*\)/, reason: 'network access (net)' },
    { pattern: /require\s*\(\s*['"`]http['"`]\s*\)/, reason: 'network access (http)' },
    { pattern: /require\s*\(\s*['"`]https['"`]\s*\)/, reason: 'network access (https)' },
    { pattern: /require\s*\(\s*['"`]dgram['"`]\s*\)/, reason: 'network access (dgram)' },
    { pattern: /require\s*\(\s*['"`]cluster['"`]\s*\)/, reason: 'cluster access (cluster)' },
    { pattern: /\bprocess\.exit\b/, reason: 'can kill the host process (process.exit)' },
    { pattern: /\bprocess\.kill\b/, reason: 'can kill processes (process.kill)' },
    { pattern: /\bglobal\.\w+\s*=/, reason: 'global pollution (global.* assignment)' },
    { pattern: /\bglobalThis\.\w+\s*=/, reason: 'global pollution (globalThis.* assignment)' },
  ];

  for (const { pattern, reason } of dangerousPatterns) {
    if (pattern.test(source)) {
      warnings.push(`Potentially dangerous pattern found: ${reason}`);
    }
  }

  return { safe: warnings.length === 0, warnings };
}

export function runPluginSmokeTest(pluginModule: SnifferExport): { passed: boolean; error: string | null } {
  try {
    const result = pluginModule.detect('', 'test.jsx', {});
    if (!Array.isArray(result)) {
      return { passed: false, error: `detect() must return an array, got ${typeof result}` };
    }
    return { passed: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { passed: false, error: `detect() threw an exception: ${message}` };
  }
}
