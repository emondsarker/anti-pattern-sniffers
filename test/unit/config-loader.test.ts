import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadConfig, loadConfigForPackage } from '../../src/cli/config-loader.js';

const CONFIG_DIR = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'config');

describe('config-loader — defaults', () => {
  it('returns default config when no config file or flags', () => {
    // Pass empty flags; loadConfig searches cwd for config files, but
    // may or may not find one. We override by ensuring nothing is passed.
    // We use a non-existent config path that is NOT specified via flags.config
    // so it just falls through to defaults.
    const config = loadConfig({});
    assert.ok(config.include.length > 0, 'include should have defaults');
    assert.ok(config.exclude.length > 0, 'exclude should have defaults');
    assert.equal(config.parallel, true);
    assert.equal(config.outputFormat, 'markdown');
    assert.ok(config.sniffers['prop-explosion'], 'prop-explosion should exist');
    assert.ok(config.sniffers['god-hook'], 'god-hook should exist');
    assert.ok(config.sniffers['prop-drilling'], 'prop-drilling should exist');
  });
});

describe('config-loader — file loading', () => {
  it('loads config from --config flag path', () => {
    const configPath = join(CONFIG_DIR, 'custom-thresholds.json');
    const config = loadConfig({ config: configPath });
    assert.equal(
      (config.sniffers['prop-explosion'] as Record<string, unknown>).threshold,
      3,
      'Should load custom threshold from config file',
    );
    assert.equal(
      (config.sniffers['prop-explosion'] as Record<string, unknown>).severity,
      'error',
      'Should load custom severity from config file',
    );
  });

  it('throws on non-existent --config path', () => {
    assert.throws(
      () => loadConfig({ config: '/does/not/exist/sniffer.config.json' }),
      /Config file not found/,
    );
  });

  it('throws on invalid JSON config', () => {
    const configPath = join(CONFIG_DIR, 'invalid-config.json');
    assert.throws(
      () => loadConfig({ config: configPath }),
      /Failed to parse config file/,
    );
  });
});

describe('config-loader — merging', () => {
  it('merges file config with defaults (file overrides)', () => {
    const configPath = join(CONFIG_DIR, 'custom-thresholds.json');
    const config = loadConfig({ config: configPath });
    // File override
    assert.equal(
      (config.sniffers['prop-explosion'] as Record<string, unknown>).threshold,
      3,
    );
    // Default preserved
    assert.equal(config.parallel, true, 'parallel should still be default true');
    assert.equal(config.maxWorkers, 4, 'maxWorkers should still be default 4');
  });
});

describe('config-loader — CLI flag overrides', () => {
  it('--format flag overrides config', () => {
    const config = loadConfig({ format: 'json' });
    assert.equal(config.outputFormat, 'json');
  });

  it('--workers flag overrides config', () => {
    const config = loadConfig({ workers: '8' });
    assert.equal(config.maxWorkers, 8);
  });

  it('--parallel=false overrides config', () => {
    const config = loadConfig({ parallel: false });
    assert.equal(config.parallel, false);
  });
});

describe('config-loader — sniffer selection', () => {
  it('--sniffers enables only specified sniffers', () => {
    const config = loadConfig({ sniffers: 'prop-explosion' });
    assert.equal(
      (config.sniffers['prop-explosion'] as Record<string, unknown>).enabled,
      true,
      'prop-explosion should be enabled',
    );
    assert.equal(
      (config.sniffers['god-hook'] as Record<string, unknown>).enabled,
      false,
      'god-hook should be disabled',
    );
    assert.equal(
      (config.sniffers['prop-drilling'] as Record<string, unknown>).enabled,
      false,
      'prop-drilling should be disabled',
    );
  });

  it('throws on unknown sniffer name in --sniffers', () => {
    assert.throws(
      () => loadConfig({ sniffers: 'nonexistent-sniffer' }),
      /Unknown sniffer "nonexistent-sniffer"/,
    );
  });
});

describe('config-loader — loadConfigForPackage', () => {
  function createTempDir(): string {
    return mkdtempSync(join(tmpdir(), 'sniffer-test-'));
  }

  function cleanup(dir: string): void {
    rmSync(dir, { recursive: true, force: true });
  }

  it('merges root and package configs', () => {
    const rootDir = createTempDir();
    const pkgDir = join(rootDir, 'packages', 'app');
    mkdirSync(pkgDir, { recursive: true });

    try {
      writeFileSync(join(rootDir, '.snifferrc.json'), JSON.stringify({
        parallel: false,
        maxWorkers: 2,
      }));
      writeFileSync(join(pkgDir, '.snifferrc.json'), JSON.stringify({
        outputFormat: 'json',
      }));

      const config = loadConfigForPackage({}, rootDir, pkgDir);
      assert.equal(config.parallel, false, 'root config parallel should be applied');
      assert.equal(config.maxWorkers, 2, 'root config maxWorkers should be applied');
      assert.equal(config.outputFormat, 'json', 'package config outputFormat should be applied');
    } finally {
      cleanup(rootDir);
    }
  });

  it('package config overrides root config', () => {
    const rootDir = createTempDir();
    const pkgDir = join(rootDir, 'packages', 'app');
    mkdirSync(pkgDir, { recursive: true });

    try {
      writeFileSync(join(rootDir, '.snifferrc.json'), JSON.stringify({
        sniffers: {
          'prop-explosion': { enabled: true, threshold: 7, severity: 'warning' },
        },
      }));
      writeFileSync(join(pkgDir, '.snifferrc.json'), JSON.stringify({
        sniffers: {
          'prop-explosion': { enabled: true, threshold: 5, severity: 'error' },
        },
      }));

      const config = loadConfigForPackage({}, rootDir, pkgDir);
      assert.equal(
        (config.sniffers['prop-explosion'] as Record<string, unknown>).threshold,
        5,
        'package threshold should override root threshold',
      );
      assert.equal(
        (config.sniffers['prop-explosion'] as Record<string, unknown>).severity,
        'error',
        'package severity should override root severity',
      );
    } finally {
      cleanup(rootDir);
    }
  });

  it('falls back to root config when no package config exists', () => {
    const rootDir = createTempDir();
    const pkgDir = join(rootDir, 'packages', 'app');
    mkdirSync(pkgDir, { recursive: true });

    try {
      writeFileSync(join(rootDir, '.snifferrc.json'), JSON.stringify({
        maxWorkers: 16,
        outputFormat: 'json',
      }));

      const config = loadConfigForPackage({}, rootDir, pkgDir);
      assert.equal(config.maxWorkers, 16, 'should use root maxWorkers');
      assert.equal(config.outputFormat, 'json', 'should use root outputFormat');
    } finally {
      cleanup(rootDir);
    }
  });

  it('auto-detects frameworks when not specified', () => {
    const rootDir = createTempDir();
    const pkgDir = join(rootDir, 'packages', 'app');
    mkdirSync(pkgDir, { recursive: true });

    try {
      // Root config with empty frameworks
      writeFileSync(join(rootDir, '.snifferrc.json'), JSON.stringify({
        frameworks: [],
      }));
      // Package has react dependency
      writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({
        name: 'test-app',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      }));

      const config = loadConfigForPackage({}, rootDir, pkgDir);
      assert.ok(config.frameworks, 'frameworks should be defined');
      assert.ok(config.frameworks!.includes('react'), 'should auto-detect react');
    } finally {
      cleanup(rootDir);
    }
  });

  it('applies CLI flag overrides on top of merged config', () => {
    const rootDir = createTempDir();
    const pkgDir = join(rootDir, 'packages', 'app');
    mkdirSync(pkgDir, { recursive: true });

    try {
      writeFileSync(join(rootDir, '.snifferrc.json'), JSON.stringify({
        outputFormat: 'markdown',
        maxWorkers: 2,
      }));

      const config = loadConfigForPackage({ format: 'json', workers: '8' }, rootDir, pkgDir);
      assert.equal(config.outputFormat, 'json', 'CLI flag should override root config');
      assert.equal(config.maxWorkers, 8, 'CLI flag should override root config');
    } finally {
      cleanup(rootDir);
    }
  });

  it('uses defaults when no root or package config exists', () => {
    const rootDir = createTempDir();
    const pkgDir = join(rootDir, 'packages', 'app');
    mkdirSync(pkgDir, { recursive: true });

    try {
      const config = loadConfigForPackage({}, rootDir, pkgDir);
      assert.equal(config.parallel, true, 'should use default parallel');
      assert.equal(config.maxWorkers, 4, 'should use default maxWorkers');
      assert.equal(config.outputFormat, 'markdown', 'should use default outputFormat');
    } finally {
      cleanup(rootDir);
    }
  });
});
