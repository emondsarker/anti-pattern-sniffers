import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { loadPlugin } from '../../src/plugins/plugin-loader.js';

const PLUGIN_FIXTURES = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'plugins');

// ---------------------------------------------------------------------------
// loadPlugin — integration tests (8 tests)
// ---------------------------------------------------------------------------
describe('loadPlugin — loads and validates plugins end-to-end', () => {
  it('1. Loads valid plugin from absolute path', () => {
    const absolutePath = join(PLUGIN_FIXTURES, 'valid-plugin.js');
    const result = loadPlugin({ path: absolutePath }, '/');
    assert.equal(result.module.name, 'no-inline-styles');
    assert.equal(typeof result.module.detect, 'function');
  });

  it('2. Loads valid plugin from relative path (relative to basePath)', () => {
    const result = loadPlugin({ path: 'valid-plugin.js' }, PLUGIN_FIXTURES);
    assert.equal(result.module.name, 'no-inline-styles');
    assert.equal(typeof result.module.detect, 'function');
  });

  it('3. Returns resolved snifferPath and module', () => {
    const result = loadPlugin({ path: 'valid-plugin.js' }, PLUGIN_FIXTURES);
    const expectedPath = join(PLUGIN_FIXTURES, 'valid-plugin.js');
    assert.equal(result.snifferPath, expectedPath);
    assert.ok(result.module !== null && typeof result.module === 'object', 'module should be a non-null object');
    assert.equal(typeof result.module.detect, 'function');
    assert.equal(typeof result.module.meta, 'object');
    assert.equal(result.module.meta.name, 'no-inline-styles');
  });

  it('4. Merges plugin defaultConfig with entry config', () => {
    // valid-plugin has defaultConfig: { maxAllowed: 0 }
    const result = loadPlugin(
      { path: 'valid-plugin.js', config: { severity: 'error', maxAllowed: 5 } },
      PLUGIN_FIXTURES,
    );
    // Entry config overrides defaultConfig for maxAllowed
    assert.equal(result.config.maxAllowed, 5);
    // Entry config adds new key
    assert.equal(result.config.severity, 'error');
  });

  it('5. Throws descriptive error if plugin file not found', () => {
    assert.throws(
      () => loadPlugin({ path: 'non-existent-plugin.js' }, PLUGIN_FIXTURES),
      (err: unknown) => {
        assert.ok(err instanceof Error, 'Expected an Error instance');
        assert.ok(
          err.message.includes('not found'),
          `Expected error message to include "not found", got: ${err.message}`,
        );
        assert.ok(
          err.message.includes('non-existent-plugin.js'),
          `Expected error message to include the plugin path, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it('6. Throws descriptive error if plugin fails export validation (invalid-shape-plugin.js)', () => {
    assert.throws(
      () => loadPlugin({ path: 'invalid-shape-plugin.js' }, PLUGIN_FIXTURES),
      (err: unknown) => {
        assert.ok(err instanceof Error, 'Expected an Error instance');
        assert.ok(
          err.message.includes('invalid exports'),
          `Expected error message to include "invalid exports", got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it('7. Throws descriptive error if plugin fails smoke test (crashing-plugin.js)', () => {
    assert.throws(
      () => loadPlugin({ path: 'crashing-plugin.js' }, PLUGIN_FIXTURES),
      (err: unknown) => {
        assert.ok(err instanceof Error, 'Expected an Error instance');
        assert.ok(
          err.message.includes('smoke test'),
          `Expected error message to include "smoke test", got: ${err.message}`,
        );
        assert.ok(
          err.message.includes('Plugin crashed intentionally'),
          `Expected error to reference original crash message, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it('8. Logs security warnings for eval-plugin.js but does NOT throw', () => {
    // eval-plugin.js uses eval() which triggers a security warning,
    // but security warnings are non-blocking — loadPlugin should succeed.
    assert.doesNotThrow(() => {
      const result = loadPlugin({ path: 'eval-plugin.js' }, PLUGIN_FIXTURES);
      assert.equal(result.module.name, 'eval-plugin');
      assert.equal(typeof result.module.detect, 'function');
      assert.equal(result.snifferPath, join(PLUGIN_FIXTURES, 'eval-plugin.js'));
    });
  });
});
