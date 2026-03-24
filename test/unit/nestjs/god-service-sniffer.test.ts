import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'nestjs', 'god-service');

import sniffer from '../../../src/sniffers/nestjs/god-service-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('god-service-sniffer — true positives', () => {
  it('detects bloated-service.ts (10 deps, 18 methods)', () => {
    const content = loadFixture('bloated-service.ts');
    const detections = sniffer.detect(content, 'bloated-service.ts', {});
    assert.ok(detections.length > 0, 'should detect god service');
  });

  it('details include dependency count and method count', () => {
    const content = loadFixture('bloated-service.ts');
    const detections = sniffer.detect(content, 'bloated-service.ts', {});
    assert.ok(detections.length > 0);
    const details = detections[0].details as Record<string, unknown>;
    assert.equal(details.dependencyCount, 10);
    assert.ok(
      (details.publicMethodCount as number) > 15,
      `publicMethodCount should be > 15, got ${details.publicMethodCount}`,
    );
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('bloated-service.ts');
    const detections = sniffer.detect(content, 'bloated-service.ts', {});
    for (const d of detections) {
      assert.ok(d.line >= 1, 'line should be >= 1');
      assert.ok(d.column >= 1, 'column should be >= 1');
    }
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('god-service-sniffer — true negatives', () => {
  it('does NOT flag lean-service.ts (3 deps, 5 methods)', () => {
    const content = loadFixture('lean-service.ts');
    const detections = sniffer.detect(content, 'lean-service.ts', {});
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.ts', {});
    assert.deepEqual(detections, []);
  });

  it('handles file without @Injectable', () => {
    const content = 'export class PlainClass { doWork() {} }';
    const detections = sniffer.detect(content, 'plain.ts', {});
    assert.deepEqual(detections, []);
  });

  it('service at exactly the default threshold is NOT flagged (strict >)', () => {
    // Build a service with exactly 8 deps and 15 public methods
    const deps = Array.from({ length: 8 }, (_, i) => `    private dep${i}: Dep${i}`).join(',\n');
    const methods = Array.from({ length: 15 }, (_, i) => `  method${i}() {}`).join('\n');
    const content = [
      `@Injectable()`,
      `export class ExactService {`,
      `  constructor(`,
      deps,
      `  ) {}`,
      methods,
      `}`,
    ].join('\n');
    const detections = sniffer.detect(content, 'exact.ts', {});
    assert.equal(detections.length, 0, 'exactly at threshold should NOT be flagged');
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('god-service-sniffer — configuration', () => {
  it('respects custom maxDependencies threshold', () => {
    const content = loadFixture('lean-service.ts');
    // lean-service has 3 deps – setting threshold to 2 should flag it
    const detections = sniffer.detect(content, 'lean-service.ts', { maxDependencies: 2 });
    assert.ok(detections.length > 0, 'should flag when maxDependencies is 2');
  });

  it('respects custom maxPublicMethods threshold', () => {
    const content = loadFixture('lean-service.ts');
    // lean-service has 5 methods – setting threshold to 4 should flag it
    const detections = sniffer.detect(content, 'lean-service.ts', { maxPublicMethods: 4 });
    assert.ok(detections.length > 0, 'should flag when maxPublicMethods is 4');
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('god-service-sniffer — output shape', () => {
  it('returns snifferName "god-service"', () => {
    const content = loadFixture('bloated-service.ts');
    const detections = sniffer.detect(content, 'bloated-service.ts', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'god-service');
    }
  });

  it('has meta with name "god-service"', () => {
    assert.equal(sniffer.meta.name, 'god-service');
    assert.equal(sniffer.meta.framework, 'nestjs');
  });
});
