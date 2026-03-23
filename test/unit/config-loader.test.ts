import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadConfig } from '../../src/cli/config-loader.js';

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
