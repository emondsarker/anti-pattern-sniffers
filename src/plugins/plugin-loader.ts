import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { validatePluginExports, validatePluginSecurity, runPluginSmokeTest } from './plugin-validator.js';
import type { PluginEntry, SnifferExport } from '../sniffers/sniffer-interface.js';
import { warn } from '../utils/logger.js';

export function loadPlugin(
  pluginEntry: PluginEntry,
  basePath: string,
): { snifferPath: string; config: Record<string, unknown>; module: SnifferExport } {
  // Resolve plugin path (relative to basePath or absolute)
  const pluginPath = resolve(basePath, pluginEntry.path);

  // Check file exists
  if (!existsSync(pluginPath)) {
    throw new Error(`Plugin file not found: ${pluginPath}`);
  }

  // Run security validation (log warnings but don't block)
  const securityResult = validatePluginSecurity(pluginPath);
  if (!securityResult.safe) {
    for (const warning of securityResult.warnings) {
      warn(`[plugin:security] ${pluginPath}: ${warning}`);
    }
  }

  // require() the module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pluginModule: unknown = require(pluginPath);

  // Run export validation (throw if invalid)
  const exportResult = validatePluginExports(pluginModule);
  if (!exportResult.valid) {
    throw new Error(
      `Plugin "${pluginPath}" has invalid exports:\n  - ${exportResult.errors.join('\n  - ')}`,
    );
  }

  const validModule = pluginModule as SnifferExport;

  // Run smoke test (throw if fails)
  const smokeResult = runPluginSmokeTest(validModule);
  if (!smokeResult.passed) {
    throw new Error(`Plugin "${pluginPath}" failed smoke test: ${smokeResult.error}`);
  }

  // Merge config: plugin's defaultConfig as base, overlaid with entry config
  const mergedConfig: Record<string, unknown> = {
    ...validModule.meta.defaultConfig,
    ...(pluginEntry.config ?? {}),
  };

  return {
    snifferPath: pluginPath,
    config: mergedConfig,
    module: validModule,
  };
}
