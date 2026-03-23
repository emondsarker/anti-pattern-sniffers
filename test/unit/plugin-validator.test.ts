import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  validatePluginExports,
  validatePluginSecurity,
  runPluginSmokeTest,
} from '../../src/plugins/plugin-validator.js';

const PLUGIN_FIXTURES = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'plugins');

// ---------------------------------------------------------------------------
// validatePluginExports — schema validation (10 tests)
// ---------------------------------------------------------------------------
describe('validatePluginExports — schema validation', () => {
  it('1. Accepts valid plugin with correct shape', () => {
    const validPlugin = require(join(PLUGIN_FIXTURES, 'valid-plugin.js'));
    const result = validatePluginExports(validPlugin);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('2. Rejects null', () => {
    const result = validatePluginExports(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0, 'Expected at least one error for null');
  });

  it('3a. Rejects undefined', () => {
    const result = validatePluginExports(undefined);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0, 'Expected at least one error for undefined');
  });

  it('3b. Rejects non-object: string', () => {
    const result = validatePluginExports('hello');
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0, 'Expected at least one error for string input');
  });

  it('3c. Rejects non-object: number', () => {
    const result = validatePluginExports(42);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0, 'Expected at least one error for number input');
  });

  it('3d. Rejects non-object: array', () => {
    const result = validatePluginExports([1, 2, 3]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0, 'Expected at least one error for array input');
  });

  it('4. Rejects plugin missing "name"', () => {
    const plugin = {
      detect() { return []; },
      meta: { name: 'test', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
    };
    const result = validatePluginExports(plugin);
    assert.equal(result.valid, false);
    const hasNameError = result.errors.some((e) => /name/i.test(e));
    assert.ok(hasNameError, `Expected an error mentioning "name", got: ${result.errors.join(', ')}`);
  });

  it('5. Rejects plugin missing "detect" function', () => {
    const plugin = {
      name: 'test-plugin',
      meta: { name: 'test', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
    };
    const result = validatePluginExports(plugin);
    assert.equal(result.valid, false);
    const hasDetectError = result.errors.some((e) => /detect/i.test(e));
    assert.ok(hasDetectError, `Expected an error mentioning "detect", got: ${result.errors.join(', ')}`);
  });

  it('6. Rejects plugin where "detect" is not a function', () => {
    const plugin = {
      name: 'test-plugin',
      detect: 'not-a-function',
      meta: { name: 'test', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
    };
    const result = validatePluginExports(plugin);
    assert.equal(result.valid, false);
    const hasDetectError = result.errors.some((e) => /detect/i.test(e));
    assert.ok(hasDetectError, `Expected an error mentioning "detect", got: ${result.errors.join(', ')}`);
  });

  it('7. Rejects plugin where "name" is not a string', () => {
    const plugin = {
      name: 123,
      detect() { return []; },
      meta: { name: 'test', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
    };
    const result = validatePluginExports(plugin);
    assert.equal(result.valid, false);
    const hasNameError = result.errors.some((e) => /name/i.test(e));
    assert.ok(hasNameError, `Expected an error mentioning "name", got: ${result.errors.join(', ')}`);
  });

  it('8. Rejects plugin with empty string name', () => {
    const plugin = {
      name: '',
      description: 'A test plugin',
      detect(_content: string, _path: string) { return []; },
      meta: { name: 'test', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
    };
    const result = validatePluginExports(plugin);
    assert.equal(result.valid, false);
    const hasNameError = result.errors.some((e) => /name/i.test(e));
    assert.ok(hasNameError, `Expected an error mentioning "name", got: ${result.errors.join(', ')}`);
  });

  it('9. Rejects plugin missing "meta" object', () => {
    const plugin = {
      name: 'test-plugin',
      detect() { return []; },
    };
    const result = validatePluginExports(plugin);
    assert.equal(result.valid, false);
    const hasMetaError = result.errors.some((e) => /meta/i.test(e));
    assert.ok(hasMetaError, `Expected an error mentioning "meta", got: ${result.errors.join(', ')}`);
  });

  it('10. Returns all errors at once (not just first)', () => {
    // Plugin missing name, detect, and meta — should report multiple errors
    const plugin = {};
    const result = validatePluginExports(plugin);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.length >= 3,
      `Expected at least 3 errors for a completely empty object, got ${result.errors.length}: ${result.errors.join('; ')}`,
    );
  });
});

// ---------------------------------------------------------------------------
// validatePluginSecurity (7 tests)
// ---------------------------------------------------------------------------
describe('validatePluginSecurity — static analysis', () => {
  it('11. Passes valid plugin with no warnings', () => {
    const result = validatePluginSecurity(join(PLUGIN_FIXTURES, 'valid-plugin.js'));
    assert.equal(result.safe, true);
    assert.equal(result.warnings.length, 0);
  });

  it('12. Warns about eval() in eval-plugin.js', () => {
    const result = validatePluginSecurity(join(PLUGIN_FIXTURES, 'eval-plugin.js'));
    assert.equal(result.safe, false);
    const hasEvalWarning = result.warnings.some((w) => /eval/i.test(w));
    assert.ok(hasEvalWarning, `Expected a warning mentioning "eval", got: ${result.warnings.join(', ')}`);
  });

  it('13. Warns about new Function() pattern', () => {
    // Create an inline check — we need a file that contains "new Function"
    const { writeFileSync, unlinkSync } = require('fs');
    const tmpPath = join(PLUGIN_FIXTURES, '_tmp-new-function-plugin.js');
    writeFileSync(tmpPath, `
      module.exports = {
        name: 'func-plugin',
        meta: { name: 'func-plugin', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
        detect(fileContent) { const fn = new Function('return 1'); return []; },
      };
    `);
    try {
      const result = validatePluginSecurity(tmpPath);
      assert.equal(result.safe, false);
      const hasFuncWarning = result.warnings.some((w) => /Function/i.test(w));
      assert.ok(hasFuncWarning, `Expected a warning mentioning "Function", got: ${result.warnings.join(', ')}`);
    } finally {
      unlinkSync(tmpPath);
    }
  });

  it('14. Warns about require("child_process")', () => {
    const { writeFileSync, unlinkSync } = require('fs');
    const tmpPath = join(PLUGIN_FIXTURES, '_tmp-child-process-plugin.js');
    writeFileSync(tmpPath, `
      module.exports = {
        name: 'cp-plugin',
        meta: { name: 'cp-plugin', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
        detect(fileContent) { const cp = require('child_process'); return []; },
      };
    `);
    try {
      const result = validatePluginSecurity(tmpPath);
      assert.equal(result.safe, false);
      const hasCpWarning = result.warnings.some((w) => /child_process/i.test(w));
      assert.ok(hasCpWarning, `Expected a warning mentioning "child_process", got: ${result.warnings.join(', ')}`);
    } finally {
      unlinkSync(tmpPath);
    }
  });

  it('15. Warns about process.exit', () => {
    const { writeFileSync, unlinkSync } = require('fs');
    const tmpPath = join(PLUGIN_FIXTURES, '_tmp-process-exit-plugin.js');
    writeFileSync(tmpPath, `
      module.exports = {
        name: 'exit-plugin',
        meta: { name: 'exit-plugin', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
        detect(fileContent) { process.exit(1); return []; },
      };
    `);
    try {
      const result = validatePluginSecurity(tmpPath);
      assert.equal(result.safe, false);
      const hasExitWarning = result.warnings.some((w) => /process\.exit/i.test(w));
      assert.ok(hasExitWarning, `Expected a warning mentioning "process.exit", got: ${result.warnings.join(', ')}`);
    } finally {
      unlinkSync(tmpPath);
    }
  });

  it('16. Warns about global assignment', () => {
    const { writeFileSync, unlinkSync } = require('fs');
    const tmpPath = join(PLUGIN_FIXTURES, '_tmp-global-assign-plugin.js');
    writeFileSync(tmpPath, `
      module.exports = {
        name: 'global-plugin',
        meta: { name: 'global-plugin', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
        detect(fileContent) { global.foo = 'bar'; return []; },
      };
    `);
    try {
      const result = validatePluginSecurity(tmpPath);
      assert.equal(result.safe, false);
      const hasGlobalWarning = result.warnings.some((w) => /global/i.test(w));
      assert.ok(hasGlobalWarning, `Expected a warning mentioning "global", got: ${result.warnings.join(', ')}`);
    } finally {
      unlinkSync(tmpPath);
    }
  });

  it('17. Returns multiple warnings when multiple issues exist', () => {
    const { writeFileSync, unlinkSync } = require('fs');
    const tmpPath = join(PLUGIN_FIXTURES, '_tmp-multi-issue-plugin.js');
    writeFileSync(tmpPath, `
      module.exports = {
        name: 'multi-issue',
        meta: { name: 'multi-issue', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
        detect(fileContent) {
          eval('1+1');
          const cp = require('child_process');
          global.x = 1;
          process.exit(0);
          return [];
        },
      };
    `);
    try {
      const result = validatePluginSecurity(tmpPath);
      assert.equal(result.safe, false);
      assert.ok(
        result.warnings.length >= 2,
        `Expected at least 2 warnings for multi-issue plugin, got ${result.warnings.length}: ${result.warnings.join('; ')}`,
      );
    } finally {
      unlinkSync(tmpPath);
    }
  });
});

// ---------------------------------------------------------------------------
// runPluginSmokeTest (5 tests)
// ---------------------------------------------------------------------------
describe('runPluginSmokeTest — runtime validation', () => {
  it('18. Passes valid plugin (detect returns array)', () => {
    const validPlugin = require(join(PLUGIN_FIXTURES, 'valid-plugin.js'));
    const result = runPluginSmokeTest(validPlugin);
    assert.equal(result.passed, true);
    assert.equal(result.error, null);
  });

  it('19. Fails crashing plugin (throws error)', () => {
    const crashingPlugin = require(join(PLUGIN_FIXTURES, 'crashing-plugin.js'));
    const result = runPluginSmokeTest(crashingPlugin);
    assert.equal(result.passed, false);
    assert.notEqual(result.error, null);
  });

  it('20. Fails plugin that returns non-array', () => {
    const badPlugin = {
      name: 'bad-return',
      description: 'Returns non-array',
      meta: { name: 'bad-return', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
      detect() { return 'not-an-array'; },
    } as any;
    const result = runPluginSmokeTest(badPlugin);
    assert.equal(result.passed, false);
    assert.notEqual(result.error, null);
  });

  it('21. Fails plugin that returns undefined', () => {
    const undefinedPlugin = {
      name: 'undef-return',
      description: 'Returns undefined',
      meta: { name: 'undef-return', description: 'test', category: 'custom', severity: 'info', defaultConfig: {} },
      detect() { return undefined; },
    } as any;
    const result = runPluginSmokeTest(undefinedPlugin);
    assert.equal(result.passed, false);
    assert.notEqual(result.error, null);
  });

  it('22. Captures error message in result', () => {
    const crashingPlugin = require(join(PLUGIN_FIXTURES, 'crashing-plugin.js'));
    const result = runPluginSmokeTest(crashingPlugin);
    assert.equal(result.passed, false);
    assert.equal(typeof result.error, 'string');
    assert.ok(
      result.error!.length > 0,
      'Expected non-empty error message',
    );
    // The crashing plugin throws "Plugin crashed intentionally"
    assert.ok(
      result.error!.includes('Plugin crashed intentionally'),
      `Expected error to contain "Plugin crashed intentionally", got: ${result.error}`,
    );
  });
});
