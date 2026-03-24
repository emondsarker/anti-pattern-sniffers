import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'express', 'callback-hell');

import sniffer from '../../../src/sniffers/express/callback-hell-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — true positives', () => {
  it('detects deep nesting in deep-nesting.js (exceeds default threshold 3)', () => {
    const content = loadFixture('deep-nesting.js');
    const detections = sniffer.detect(content, 'deep-nesting.js', {});
    assert.ok(detections.length > 0, 'should detect deep callback nesting');
  });

  it('returns 2 detections for deep-nesting.js (depth 4 and 5)', () => {
    const content = loadFixture('deep-nesting.js');
    const detections = sniffer.detect(content, 'deep-nesting.js', {});
    assert.equal(detections.length, 2);
    const depths = detections.map(d => (d.details as Record<string, unknown>).depth);
    assert.ok(depths.includes(4), 'should detect nesting at depth 4');
    assert.ok(depths.includes(5), 'should detect nesting at depth 5');
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('deep-nesting.js');
    const detections = sniffer.detect(content, 'deep-nesting.js', {});
    for (const d of detections) {
      assert.ok(d.line >= 1, 'line should be >= 1');
      assert.ok(d.column >= 1, 'column should be >= 1');
    }
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — true negatives', () => {
  it('does NOT flag flat-async.js', () => {
    const content = loadFixture('flat-async.js');
    const detections = sniffer.detect(content, 'flat-async.js', {});
    assert.equal(detections.length, 0);
  });

  it('2 levels of nesting does NOT trigger at default threshold 3', () => {
    const content = [
      'function outer(callback) {',
      '  doSomething((err, data) => {',
      '    doMore(data, (err2, result) => {',
      '      callback(null, result);',
      '    });',
      '  });',
      '}',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', { maxDepth: 3 });
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.js', {});
    assert.deepEqual(detections, []);
  });

  it('handles file with no callbacks', () => {
    const content = 'const x = 1 + 2;\nconsole.log(x);\n';
    const detections = sniffer.detect(content, 'test.js', {});
    assert.deepEqual(detections, []);
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — configuration', () => {
  it('respects custom maxDepth threshold', () => {
    const content = loadFixture('deep-nesting.js');
    // deep-nesting.js has 5 levels of callback functions.
    // With maxDepth=1, depths 2..5 all exceed threshold
    const detections = sniffer.detect(content, 'deep-nesting.js', { maxDepth: 1 });
    assert.ok(detections.length > 2, 'lower threshold should produce more detections');
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — output shape', () => {
  it('returns snifferName "callback-hell"', () => {
    const content = loadFixture('deep-nesting.js');
    const detections = sniffer.detect(content, 'deep-nesting.js', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'callback-hell');
    }
  });

  it('has meta with name "callback-hell"', () => {
    assert.equal(sniffer.meta.name, 'callback-hell');
    assert.equal(sniffer.meta.severity, 'warning');
    assert.equal(sniffer.meta.framework, 'express');
  });
});
