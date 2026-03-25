import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'nestjs', 'missing-guards');

import sniffer from '../../../src/sniffers/nestjs/missing-guards-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('missing-guards-sniffer — true positives', () => {
  it('detects unguarded-admin.ts (admin routes without @UseGuards)', () => {
    const content = loadFixture('unguarded-admin.ts');
    const detections = sniffer.detect(content, 'unguarded-admin.ts', {});
    assert.ok(detections.length > 0, 'should detect unguarded admin routes');
  });

  it('flags multiple unguarded routes on sensitive paths', () => {
    const content = loadFixture('unguarded-admin.ts');
    const detections = sniffer.detect(content, 'unguarded-admin.ts', {});
    // unguarded-admin.ts has 3 route handlers: @Get('users'), @Delete('users/:id'), @Get('dashboard')
    assert.ok(detections.length >= 2, `expected >= 2 detections, got ${detections.length}`);
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('unguarded-admin.ts');
    const detections = sniffer.detect(content, 'unguarded-admin.ts', {});
    for (const d of detections) {
      assert.ok(d.line >= 1, 'line should be >= 1');
      assert.ok(d.column >= 1, 'column should be >= 1');
    }
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('missing-guards-sniffer — true negatives', () => {
  it('does NOT flag guarded-admin.ts (has @UseGuards at class level)', () => {
    const content = loadFixture('guarded-admin.ts');
    const detections = sniffer.detect(content, 'guarded-admin.ts', {});
    assert.equal(detections.length, 0);
  });

  it('class-level @UseGuards protects all methods', () => {
    const content = [
      `import { Controller, Get, UseGuards } from '@nestjs/common';`,
      `@Controller('admin')`,
      `@UseGuards(AuthGuard)`,
      `export class AdminController {`,
      `  @Get('users')`,
      `  getUsers() { return []; }`,
      `  @Get('dashboard')`,
      `  getDashboard() { return {}; }`,
      `}`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.equal(detections.length, 0, 'class-level guard should protect all routes');
  });

  it('non-sensitive routes without guards are NOT flagged', () => {
    const content = [
      `import { Controller, Get } from '@nestjs/common';`,
      `@Controller('products')`,
      `export class ProductsController {`,
      `  @Get()`,
      `  findAll() { return []; }`,
      `}`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.equal(detections.length, 0, 'non-sensitive route should not be flagged');
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.ts', {});
    assert.deepEqual(detections, []);
  });

  it('file without @Controller is not scanned', () => {
    const content = [
      `import { Injectable } from '@nestjs/common';`,
      `@Injectable()`,
      `export class AdminService {`,
      `  getUsers() { return []; }`,
      `}`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.equal(detections.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('missing-guards-sniffer — configuration', () => {
  it('respects custom severity override', () => {
    const content = loadFixture('unguarded-admin.ts');
    const detections = sniffer.detect(content, 'unguarded-admin.ts', { severity: 'error' });
    assert.ok(detections.length > 0);
    for (const d of detections) {
      assert.equal(d.severity, 'error');
    }
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('missing-guards-sniffer — output shape', () => {
  it('returns snifferName "missing-guards"', () => {
    const content = loadFixture('unguarded-admin.ts');
    const detections = sniffer.detect(content, 'unguarded-admin.ts', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'missing-guards');
    }
  });

  it('has meta with name "missing-guards"', () => {
    assert.equal(sniffer.meta.name, 'missing-guards');
    assert.equal(sniffer.meta.framework, 'nestjs');
  });
});
