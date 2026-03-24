import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'express', 'missing-error-handling');

import sniffer from '../../../src/sniffers/express/missing-error-handling-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('missing-error-handling-sniffer — true positives', () => {
  it('detects async handlers without try-catch in no-try-catch.js', () => {
    const content = loadFixture('no-try-catch.js');
    const detections = sniffer.detect(content, 'no-try-catch.js', {});
    assert.equal(detections.length, 2);
  });

  it('multiple async handlers are flagged individually', () => {
    const content = loadFixture('no-try-catch.js');
    const detections = sniffer.detect(content, 'no-try-catch.js', {});
    assert.equal(detections.length, 2);
    const methods = detections.map(d => d.message);
    assert.ok(methods.some(m => m.includes('GET')), 'should flag async GET handler');
    assert.ok(methods.some(m => m.includes('POST')), 'should flag async POST handler');
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('no-try-catch.js');
    const detections = sniffer.detect(content, 'no-try-catch.js', {});
    for (const d of detections) {
      assert.ok(d.line >= 1, 'line should be >= 1');
      assert.ok(d.column >= 1, 'column should be >= 1');
    }
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('missing-error-handling-sniffer — true negatives', () => {
  it('does NOT flag with-try-catch.js', () => {
    const content = loadFixture('with-try-catch.js');
    const detections = sniffer.detect(content, 'with-try-catch.js', {});
    assert.equal(detections.length, 0);
  });

  it('does NOT flag with-error-middleware.js (has centralized error handler)', () => {
    const content = loadFixture('with-error-middleware.js');
    const detections = sniffer.detect(content, 'with-error-middleware.js', {});
    assert.equal(detections.length, 0);
  });

  it('non-async handlers are NOT flagged', () => {
    const content = [
      "const app = require('express')();",
      "app.get('/test', (req, res) => {",
      '  const data = db.find();',
      '  res.json(data);',
      '});',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', {});
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.js', {});
    assert.deepEqual(detections, []);
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('missing-error-handling-sniffer — output shape', () => {
  it('returns snifferName "missing-error-handling"', () => {
    const content = loadFixture('no-try-catch.js');
    const detections = sniffer.detect(content, 'no-try-catch.js', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'missing-error-handling');
    }
  });

  it('has meta with name "missing-error-handling"', () => {
    assert.equal(sniffer.meta.name, 'missing-error-handling');
    assert.equal(sniffer.meta.severity, 'warning');
    assert.equal(sniffer.meta.framework, 'express');
  });
});
