import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'nestjs', 'missing-dtos');

import sniffer from '../../../src/sniffers/nestjs/missing-dtos-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('missing-dtos-sniffer — true positives', () => {
  it('detects "any" type in @Body() in no-dto.ts', () => {
    const content = loadFixture('no-dto.ts');
    const detections = sniffer.detect(content, 'no-dto.ts', {});
    const bodyDetections = detections.filter(
      d => (d.details as Record<string, unknown>).decorator === '@Body()',
    );
    assert.ok(bodyDetections.length > 0, 'should detect untyped @Body()');
    // Check that at least one has typeName === 'any'
    const anyTyped = bodyDetections.filter(
      d => (d.details as Record<string, unknown>).typeName === 'any',
    );
    assert.ok(anyTyped.length > 0, 'should detect @Body() with "any" type');
  });

  it('detects "any" type in @Param() in no-dto.ts', () => {
    const content = loadFixture('no-dto.ts');
    const detections = sniffer.detect(content, 'no-dto.ts', {});
    const paramDetections = detections.filter(
      d => (d.details as Record<string, unknown>).decorator === '@Param()',
    );
    assert.ok(paramDetections.length > 0, 'should detect untyped @Param()');
  });

  it('multiple untyped params produce multiple detections', () => {
    const content = loadFixture('no-dto.ts');
    const detections = sniffer.detect(content, 'no-dto.ts', {});
    // no-dto.ts has: @Body() body: any, @Param('id') id: any, @Body() data: any
    assert.ok(detections.length >= 3, `expected >= 3 detections, got ${detections.length}`);
  });

  it('missing type annotation (no ": type") also triggers', () => {
    // Parameter with @Body() but no type annotation at all
    const content = [
      `import { Controller, Post, Body } from '@nestjs/common';`,
      `@Controller('test')`,
      `export class TestController {`,
      `  @Post()`,
      `  create(@Body() body) {`,
      `    return body;`,
      `  }`,
      `}`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.ok(detections.length > 0, 'should flag missing type annotation');
    const detail = detections[0].details as Record<string, unknown>;
    assert.equal(detail.typeName, null, 'typeName should be null when missing');
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('no-dto.ts');
    const detections = sniffer.detect(content, 'no-dto.ts', {});
    for (const d of detections) {
      assert.ok(d.line >= 1, 'line should be >= 1');
      assert.ok(d.column >= 1, 'column should be >= 1');
    }
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('missing-dtos-sniffer — true negatives', () => {
  it('does NOT flag with-dto.ts (proper types)', () => {
    const content = loadFixture('with-dto.ts');
    const detections = sniffer.detect(content, 'with-dto.ts', {});
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.ts', {});
    assert.deepEqual(detections, []);
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('missing-dtos-sniffer — output shape', () => {
  it('returns snifferName "missing-dtos"', () => {
    const content = loadFixture('no-dto.ts');
    const detections = sniffer.detect(content, 'no-dto.ts', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'missing-dtos');
    }
  });

  it('has meta with name "missing-dtos"', () => {
    assert.equal(sniffer.meta.name, 'missing-dtos');
    assert.equal(sniffer.meta.framework, 'nestjs');
  });
});
