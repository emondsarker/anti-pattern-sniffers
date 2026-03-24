import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'nestjs', 'business-logic-in-controllers');

import sniffer from '../../../src/sniffers/nestjs/business-logic-in-controllers-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('business-logic-in-controllers-sniffer — true positives', () => {
  it('detects fat-controller.ts (business logic and many lines)', () => {
    const content = loadFixture('fat-controller.ts');
    const detections = sniffer.detect(content, 'fat-controller.ts', {});
    assert.ok(detections.length > 0, 'should detect business logic in controller');
  });

  it('detects business logic keywords (reduce, Math, for)', () => {
    const content = loadFixture('fat-controller.ts');
    const detections = sniffer.detect(content, 'fat-controller.ts', {});
    assert.ok(detections.length > 0);
    const details = detections[0].details as Record<string, unknown>;
    const keywords = details.businessLogicKeywords as string[];
    assert.ok(keywords.length > 0, 'should detect business logic keywords');
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('fat-controller.ts');
    const detections = sniffer.detect(content, 'fat-controller.ts', {});
    for (const d of detections) {
      assert.ok(d.line >= 1, 'line should be >= 1');
      assert.ok(d.column >= 1, 'column should be >= 1');
    }
  });

  it('respects custom maxMethodLines threshold', () => {
    const content = loadFixture('thin-controller.ts');
    // thin-controller has a small method body; set threshold to 1 to trigger
    const detections = sniffer.detect(content, 'thin-controller.ts', { maxMethodLines: 1 });
    assert.ok(detections.length > 0, 'should flag when maxMethodLines is very low');
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('business-logic-in-controllers-sniffer — true negatives', () => {
  it('does NOT flag thin-controller.ts', () => {
    const content = loadFixture('thin-controller.ts');
    const detections = sniffer.detect(content, 'thin-controller.ts', {});
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.ts', {});
    assert.deepEqual(detections, []);
  });

  it('file without @Controller is not scanned', () => {
    const content = [
      `import { Injectable } from '@nestjs/common';`,
      `@Injectable()`,
      `export class SomeService {`,
      `  compute() { return Math.random(); }`,
      `}`,
    ].join('\n');
    const detections = sniffer.detect(content, 'service.ts', {});
    assert.equal(detections.length, 0, 'non-controller file should not be scanned');
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('business-logic-in-controllers-sniffer — output shape', () => {
  it('returns snifferName "business-logic-in-controllers"', () => {
    const content = loadFixture('fat-controller.ts');
    const detections = sniffer.detect(content, 'fat-controller.ts', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'business-logic-in-controllers');
    }
  });

  it('has meta with name "business-logic-in-controllers"', () => {
    assert.equal(sniffer.meta.name, 'business-logic-in-controllers');
    assert.equal(sniffer.meta.framework, 'nestjs');
  });
});
