import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';

const exec = promisify(execFile);

const BIN = join(__dirname, '..', '..', '..', 'bin', 'sniff.js');
const FIXTURES_DIR = join(__dirname, '..', '..', '..', 'test', 'fixtures');
const PROP_EXPLOSION_DIR = join(FIXTURES_DIR, 'prop-explosion');
const CONFIG_DIR = join(FIXTURES_DIR, 'config');

/**
 * Helper: collect all detections from the JSON output's `files` object into a flat array.
 */
function flattenDetections(parsed: Record<string, unknown>): Record<string, unknown>[] {
  const files = parsed.files as Record<string, Record<string, unknown>[]>;
  const all: Record<string, unknown>[] = [];
  for (const detections of Object.values(files)) {
    all.push(...detections);
  }
  return all;
}

// ---------------------------------------------------------------------------
// CLI integration tests
// ---------------------------------------------------------------------------
describe('CLI integration', () => {

  it('1. --help flag exits 0 and prints usage', async () => {
    const { stdout } = await exec('node', [BIN, '--help']);
    assert.ok(stdout.includes('Usage'), 'Expected stdout to contain "Usage"');
  });

  it('2. --version flag exits 0 and prints version number', async () => {
    const { stdout } = await exec('node', [BIN, '--version']);
    assert.ok(
      stdout.includes('0.2.0'),
      `Expected stdout to contain "0.2.0", got: ${stdout.trim()}`,
    );
  });

  it('3. Exits code 1 when issues are found', async () => {
    try {
      await exec('node', [BIN, '--dir', PROP_EXPLOSION_DIR]);
      assert.fail('Expected non-zero exit code');
    } catch (err: any) {
      assert.equal(err.code, 1, `Expected exit code 1, got ${err.code}`);
      assert.ok(
        err.stdout.length > 0,
        'Expected stdout to contain issue output',
      );
    }
  });

  it('4. Exits code 0 when no issues are found', async () => {
    // The config directory contains only .json files, no jsx/tsx,
    // so the default include pattern finds nothing.
    const { stdout } = await exec('node', [BIN, '--dir', CONFIG_DIR]);
    // Should exit 0 (no assertion needed for exit code — exec resolves on 0)
    assert.equal(typeof stdout, 'string');
  });

  it('5. --format json produces valid JSON with expected structure', async () => {
    try {
      await exec('node', [BIN, '--dir', PROP_EXPLOSION_DIR, '--format', 'json']);
      assert.fail('Expected non-zero exit code');
    } catch (err: any) {
      assert.equal(err.code, 1);
      const parsed = JSON.parse(err.stdout);
      assert.ok(typeof parsed.meta === 'object', 'Expected "meta" object in JSON output');
      assert.ok(typeof parsed.files === 'object', 'Expected "files" object in JSON output');
      assert.ok(typeof parsed.summary === 'object', 'Expected "summary" object in JSON output');
      assert.ok(typeof parsed.meta.totalIssues === 'number', 'Expected "meta.totalIssues" to be a number');
      assert.ok(parsed.meta.totalIssues > 0, 'Expected at least one issue');
    }
  });

  it('6. --sniffers flag limits output to requested sniffer', async () => {
    try {
      await exec('node', [
        BIN,
        '--dir', PROP_EXPLOSION_DIR,
        '--sniffers', 'prop-explosion',
        '--format', 'json',
      ]);
      assert.fail('Expected non-zero exit code');
    } catch (err: any) {
      assert.equal(err.code, 1);
      const parsed = JSON.parse(err.stdout);
      const detections = flattenDetections(parsed);
      assert.ok(detections.length > 0, 'Expected at least one detection');
      // Every detection should come from prop-explosion sniffer
      for (const detection of detections) {
        assert.equal(
          detection.snifferName,
          'prop-explosion',
          `Expected snifferName "prop-explosion", got "${detection.snifferName}"`,
        );
      }
    }
  });

  it('7. --output flag writes report to file', async () => {
    const outputPath = join('/tmp', `cli-test-report-${Date.now()}.md`);

    try {
      try {
        await exec('node', [BIN, '--dir', PROP_EXPLOSION_DIR, '--output', outputPath]);
        assert.fail('Expected non-zero exit code');
      } catch (err: any) {
        assert.equal(err.code, 1, `Expected exit code 1, got ${err.code}`);
      }

      assert.ok(existsSync(outputPath), `Expected file to exist at ${outputPath}`);
      const content = readFileSync(outputPath, 'utf8');
      assert.ok(content.length > 0, 'Expected file to have content');
    } finally {
      // Cleanup
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    }
  });

  it('8. --quiet flag suppresses stdout', async () => {
    try {
      await exec('node', [BIN, '--dir', PROP_EXPLOSION_DIR, '--quiet']);
      assert.fail('Expected non-zero exit code');
    } catch (err: any) {
      assert.equal(err.code, 1);
      assert.equal(
        err.stdout.trim(),
        '',
        `Expected empty stdout with --quiet, got: ${err.stdout.trim()}`,
      );
    }
  });

  it('9. --no-parallel flag still produces correct output', async () => {
    try {
      await exec('node', [
        BIN,
        '--dir', PROP_EXPLOSION_DIR,
        '--no-parallel',
        '--format', 'json',
      ]);
      assert.fail('Expected non-zero exit code');
    } catch (err: any) {
      assert.equal(err.code, 1);
      const parsed = JSON.parse(err.stdout);
      const detections = flattenDetections(parsed);
      assert.ok(detections.length > 0, 'Expected at least one detection');
      assert.ok(typeof parsed.meta.totalIssues === 'number', 'Expected totalIssues to be a number');
      assert.ok(parsed.meta.totalIssues > 0, 'Expected at least one issue');
    }
  });

  it('10. Invalid config exits with code 2', async () => {
    const invalidConfig = join(CONFIG_DIR, 'invalid-config.json');

    try {
      await exec('node', [BIN, '--dir', PROP_EXPLOSION_DIR, '--config', invalidConfig]);
      assert.fail('Expected non-zero exit code');
    } catch (err: any) {
      assert.equal(
        err.code,
        2,
        `Expected exit code 2 for invalid config, got ${err.code}. stderr: ${err.stderr}`,
      );
    }
  });

  it('11. Custom config thresholds detect more issues than default', async () => {
    // Run with default config
    let defaultIssueCount: number;
    try {
      await exec('node', [
        BIN,
        '--dir', PROP_EXPLOSION_DIR,
        '--format', 'json',
      ]);
      // If it exits 0, there were no issues
      defaultIssueCount = 0;
    } catch (err: any) {
      const parsed = JSON.parse(err.stdout);
      defaultIssueCount = parsed.meta.totalIssues;
    }

    // Run with custom thresholds (lower thresholds = more issues)
    const customConfig = join(CONFIG_DIR, 'custom-thresholds.json');
    let customIssueCount: number;
    try {
      await exec('node', [
        BIN,
        '--dir', PROP_EXPLOSION_DIR,
        '--format', 'json',
        '--config', customConfig,
      ]);
      customIssueCount = 0;
    } catch (err: any) {
      const parsed = JSON.parse(err.stdout);
      customIssueCount = parsed.meta.totalIssues;
    }

    assert.ok(
      customIssueCount > defaultIssueCount,
      `Expected custom config (threshold: 3) to find more issues (${customIssueCount}) ` +
      `than default (threshold: 7) (${defaultIssueCount})`,
    );
  });

});
