import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'nestjs', 'magic-strings');

import sniffer from '../../../src/sniffers/nestjs/magic-strings-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('magic-strings-sniffer — true positives', () => {
  it('detects "pending_review" repeated 4+ times in with-magic-strings.ts', () => {
    const content = loadFixture('with-magic-strings.ts');
    const detections = sniffer.detect(content, 'with-magic-strings.ts', {});
    const pendingDetection = detections.find(
      d => (d.details as Record<string, unknown>).value === 'pending_review',
    );
    assert.ok(pendingDetection, 'should detect "pending_review"');
    const occurrences = (pendingDetection!.details as Record<string, unknown>).occurrences as number;
    assert.ok(occurrences >= 4, `expected >= 4 occurrences, got ${occurrences}`);
  });

  it('detects "express_shipping" repeated 3+ times', () => {
    const content = loadFixture('with-magic-strings.ts');
    const detections = sniffer.detect(content, 'with-magic-strings.ts', {});
    const expressDetection = detections.find(
      d => (d.details as Record<string, unknown>).value === 'express_shipping',
    );
    assert.ok(expressDetection, 'should detect "express_shipping"');
    const occurrences = (expressDetection!.details as Record<string, unknown>).occurrences as number;
    assert.ok(occurrences >= 3, `expected >= 3 occurrences, got ${occurrences}`);
  });

  it('returns details with string value and occurrence count', () => {
    const content = loadFixture('with-magic-strings.ts');
    const detections = sniffer.detect(content, 'with-magic-strings.ts', {});
    assert.ok(detections.length > 0);
    for (const d of detections) {
      const details = d.details as Record<string, unknown>;
      assert.ok(typeof details.value === 'string', 'details should have value');
      assert.ok(typeof details.occurrences === 'number', 'details should have occurrences');
      assert.ok(typeof details.minOccurrences === 'number', 'details should have minOccurrences');
    }
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('with-magic-strings.ts');
    const detections = sniffer.detect(content, 'with-magic-strings.ts', {});
    for (const d of detections) {
      assert.ok(d.line >= 1, 'line should be >= 1');
      assert.ok(d.column >= 1, 'column should be >= 1');
    }
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('magic-strings-sniffer — true negatives', () => {
  it('does NOT flag with-enums.ts (uses enum constants)', () => {
    const content = loadFixture('with-enums.ts');
    const detections = sniffer.detect(content, 'with-enums.ts', {});
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.ts', {});
    assert.deepEqual(detections, []);
  });

  it('does NOT flag file with no relevant patterns', () => {
    const content = 'const x = 1 + 2;\nconsole.log(x);\n';
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.deepEqual(detections, []);
  });

  it('2 occurrences of a string does NOT trigger at default threshold 3', () => {
    const content = [
      `if (status === 'draft') { doA(); }`,
      `if (status === 'draft') { doB(); }`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.equal(detections.length, 0, '2 occurrences should not trigger at threshold 3');
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('magic-strings-sniffer — configuration', () => {
  it('respects custom minOccurrences threshold', () => {
    // With minOccurrences=2, even 2 occurrences should trigger
    const content = [
      `if (status === 'draft') { doA(); }`,
      `if (status === 'draft') { doB(); }`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', { minOccurrences: 2 });
    assert.ok(detections.length > 0, 'should detect at custom threshold 2');
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('magic-strings-sniffer — output shape', () => {
  it('returns snifferName "magic-strings"', () => {
    const content = loadFixture('with-magic-strings.ts');
    const detections = sniffer.detect(content, 'with-magic-strings.ts', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'magic-strings');
    }
  });

  it('has meta with name "magic-strings"', () => {
    assert.equal(sniffer.meta.name, 'magic-strings');
    assert.equal(sniffer.meta.framework, 'nestjs');
  });
});
