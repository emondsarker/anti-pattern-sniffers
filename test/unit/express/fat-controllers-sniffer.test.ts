import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'express', 'fat-controllers');

import sniffer from '../../../src/sniffers/express/fat-controllers-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('fat-controllers-sniffer — true positives', () => {
  it('detects fat handler in fat-handler.js (>50 lines and >3 awaits)', () => {
    const content = loadFixture('fat-handler.js');
    const detections = sniffer.detect(content, 'fat-handler.js', {});
    assert.equal(detections.length, 1);
    assert.ok(detections[0].message.includes('post()'));
    assert.ok(detections[0].message.includes('lines'));
    assert.ok(detections[0].message.includes('await calls'));
  });

  it('returns correct lineCount and awaitCount in details', () => {
    const content = loadFixture('fat-handler.js');
    const detections = sniffer.detect(content, 'fat-handler.js', {});
    const details = detections[0].details as Record<string, unknown>;
    assert.equal(details.lineCount, 78);
    assert.equal(details.awaitCount, 11);
    assert.equal(details.maxLines, 50);
    assert.equal(details.maxAwaits, 3);
  });

  it('handler with many awaits but few lines is still flagged', () => {
    const content = [
      "const app = require('express')();",
      "app.post('/test', async (req, res) => {",
      '  const a = await db.one();',
      '  const b = await db.two();',
      '  const c = await db.three();',
      '  const d = await db.four();',
      '  const e = await db.five();',
      '  res.json({a,b,c,d,e});',
      '});',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', {});
    assert.equal(detections.length, 1);
    assert.ok(detections[0].message.includes('5 await calls'));
    const details = detections[0].details as Record<string, unknown>;
    assert.equal(details.awaitCount, 5);
    assert.ok((details.lineCount as number) <= 50, 'lineCount should be below maxLines threshold');
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('fat-controllers-sniffer — true negatives', () => {
  it('does NOT flag slim-handler.js', () => {
    const content = loadFixture('slim-handler.js');
    const detections = sniffer.detect(content, 'slim-handler.js', {});
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.js', {});
    assert.deepEqual(detections, []);
  });

  it('does NOT flag file with no relevant patterns', () => {
    const content = 'const x = 1 + 2;\nconsole.log(x);\n';
    const detections = sniffer.detect(content, 'test.js', {});
    assert.deepEqual(detections, []);
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('fat-controllers-sniffer — configuration', () => {
  it('respects custom maxLines threshold', () => {
    const content = loadFixture('slim-handler.js');
    // slim-handler is small — set maxLines very low to trigger
    const detections = sniffer.detect(content, 'slim-handler.js', { maxLines: 2 });
    assert.ok(detections.length > 0, 'should flag slim-handler with maxLines=2');
  });

  it('respects custom maxAwaits threshold', () => {
    const content = loadFixture('slim-handler.js');
    // slim-handler has 1 await — set maxAwaits to 0 to trigger
    const detections = sniffer.detect(content, 'slim-handler.js', { maxAwaits: 0, maxLines: 1000 });
    assert.ok(detections.length > 0, 'should flag slim-handler with maxAwaits=0');
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('fat-controllers-sniffer — output shape', () => {
  it('returns snifferName "fat-controllers"', () => {
    const content = loadFixture('fat-handler.js');
    const detections = sniffer.detect(content, 'fat-handler.js', {});
    assert.equal(detections[0].snifferName, 'fat-controllers');
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('fat-handler.js');
    const detections = sniffer.detect(content, 'fat-handler.js', {});
    assert.ok(detections[0].line >= 1, 'line should be >= 1');
    assert.ok(detections[0].column >= 1, 'column should be >= 1');
  });
});
