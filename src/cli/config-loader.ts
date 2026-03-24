import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { SnifferConfig } from '../sniffers/sniffer-interface.js';
import { detectFrameworks } from '../utils/framework-detector.js';

const DEFAULT_CONFIG: SnifferConfig = {
  frameworks: ['react'],
  include: ['**/*.{jsx,tsx}'],
  exclude: ['node_modules', 'dist', 'build', '**/*.test.*', '**/*.spec.*'],
  parallel: true,
  maxWorkers: 4,
  timeoutMs: 30000,
  outputFormat: 'markdown',
  outputPath: null,
  sniffers: {
    'prop-explosion': { enabled: true, threshold: 7, severity: 'warning' },
    'god-hook': { enabled: true, maxUseState: 4, maxUseEffect: 3, maxTotalHooks: 10, severity: 'warning' },
    'prop-drilling': {
      enabled: true,
      severity: 'warning',
      whitelistedProps: ['className', 'style', 'children', 'key', 'ref', 'id', 'data-testid'],
    },
  },
  plugins: [],
};

/**
 * Deep merge two objects. Source values override target values.
 * Arrays are replaced, not merged.
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      result[key] = sourceVal;
    }
  }

  return result;
}

/**
 * Find a config file by searching common names in the given directory.
 */
function findConfigFile(dir: string): string | null {
  const candidates = [
    '.snifferrc.json',
    '.snifferrc.js',
    'sniffer.config.json',
    'sniffer.config.js',
  ];

  for (const name of candidates) {
    const fullPath = join(dir, name);
    if (existsSync(fullPath)) return fullPath;
  }

  return null;
}

/**
 * Parse a config file from disk and return the parsed object.
 */
function parseConfigFile(filePath: string): Record<string, unknown> {
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `Failed to parse config file ${filePath}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/**
 * Apply CLI flag overrides to a config object.
 */
function applyCLIFlags(config: SnifferConfig, flags: Record<string, string | boolean>): SnifferConfig {
  const merged = { ...config, sniffers: { ...config.sniffers } };

  if (typeof flags.dir === 'string') {
    // Dir is handled at orchestrator level, not in config
  }

  if (typeof flags.format === 'string') {
    if (flags.format !== 'markdown' && flags.format !== 'json') {
      throw new Error(`Invalid format "${flags.format}". Supported: markdown, json`);
    }
    merged.outputFormat = flags.format;
  }

  if (typeof flags.output === 'string') {
    merged.outputPath = flags.output;
  }

  if (typeof flags.workers === 'string') {
    const n = parseInt(flags.workers, 10);
    if (isNaN(n) || n < 1) {
      throw new Error(`Invalid workers count "${flags.workers}". Must be a positive integer.`);
    }
    merged.maxWorkers = n;
  }

  if (flags.parallel === false || flags.parallel === 'false') {
    merged.parallel = false;
  } else if (flags.parallel === true || flags.parallel === 'true') {
    merged.parallel = true;
  }

  if (typeof flags.sniffers === 'string') {
    const requested = flags.sniffers.split(',').map(s => s.trim());
    // Disable all, then enable only requested
    for (const key of Object.keys(merged.sniffers)) {
      (merged.sniffers[key] as Record<string, unknown>).enabled = false;
    }
    for (const name of requested) {
      if (merged.sniffers[name]) {
        (merged.sniffers[name] as Record<string, unknown>).enabled = true;
      } else {
        throw new Error(`Unknown sniffer "${name}". Available: ${Object.keys(merged.sniffers).join(', ')}`);
      }
    }
  }

  return merged;
}

/**
 * Load configuration by merging:
 * 1. Built-in defaults
 * 2. Config file (.snifferrc.json or --config path)
 * 3. CLI flags
 */
export function loadConfig(flags: Record<string, string | boolean>): SnifferConfig {
  let fileConfig: Record<string, unknown> = {};

  // Determine config file path
  const configPath = typeof flags.config === 'string'
    ? resolve(flags.config)
    : findConfigFile(process.cwd());

  if (configPath) {
    if (!existsSync(configPath)) {
      if (flags.config) {
        throw new Error(`Config file not found: ${configPath}`);
      }
    } else {
      fileConfig = parseConfigFile(configPath);
    }
  }

  // Merge defaults + file config
  const merged = deepMerge(
    DEFAULT_CONFIG as unknown as Record<string, unknown>,
    fileConfig,
  ) as unknown as SnifferConfig;

  // Apply CLI flag overrides
  return applyCLIFlags(merged, flags);
}

/**
 * Load config with inheritance: DEFAULT → root config → package config → CLI flags.
 * Used in workspace mode where each package may have its own .snifferrc.json.
 */
export function loadConfigForPackage(
  flags: Record<string, string | boolean>,
  rootDir: string,
  packageDir: string,
): SnifferConfig {
  let config = { ...DEFAULT_CONFIG };

  // 1. Merge root config
  const rootConfigFile = findConfigFile(rootDir);
  if (rootConfigFile) {
    const rootConfig = parseConfigFile(rootConfigFile);
    config = deepMerge(config as unknown as Record<string, unknown>, rootConfig) as unknown as SnifferConfig;
  }

  // 2. Merge package config (if different from root)
  if (packageDir !== rootDir) {
    const pkgConfigFile = findConfigFile(packageDir);
    if (pkgConfigFile) {
      const pkgConfig = parseConfigFile(pkgConfigFile);
      config = deepMerge(config as unknown as Record<string, unknown>, pkgConfig) as unknown as SnifferConfig;
    }
  }

  // 3. Auto-detect frameworks if not specified in any config
  if (!config.frameworks || config.frameworks.length === 0) {
    const detected = detectFrameworks(packageDir);
    if (detected.length > 0) {
      config.frameworks = detected;
    }
  }

  // 4. Apply CLI flag overrides (same logic as existing loadConfig)
  config = applyCLIFlags(config, flags);

  return config;
}

export { DEFAULT_CONFIG };
