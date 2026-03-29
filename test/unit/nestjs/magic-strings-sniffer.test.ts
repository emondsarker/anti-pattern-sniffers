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
    assert.ok(occurrences >= 3, `expected >= 3 occurrences, got ${occurrences}`);
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

  it('does NOT flag strings declared in TypeScript union literal types', () => {
    const content = loadFixture('with-union-types.ts');
    const detections = sniffer.detect(content, 'with-union-types.ts', {});
    assert.equal(detections.length, 0, 'Union type discriminator strings should not be flagged');
  });

  it('does NOT flag strings that appear only within switch blocks', () => {
    const content = loadFixture('switch-only-strings.ts');
    const detections = sniffer.detect(content, 'switch-only-strings.ts', {});
    assert.equal(detections.length, 0, 'Strings confined to switch blocks should not be flagged');
  });

  it('does NOT flag case-label-exempt.ts (strings in both case and conditionals)', () => {
    const content = loadFixture('case-label-exempt.ts');
    const detections = sniffer.detect(content, 'case-label-exempt.ts', {});
    assert.equal(detections.length, 0, 'Strings appearing as case labels should be exempt');
  });

  it('does NOT flag strings in ignoredStrings config', () => {
    const content = [
      `if (filter === 'all') { showAll(); }`,
      `if (filter === 'all') { resetPage(); }`,
      `if (filter === 'all') { clearSearch(); }`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', { ignoredStrings: ['all'] });
    assert.equal(detections.length, 0, 'Ignored strings should not be flagged');
  });

  it('does NOT flag typed mode comparisons with union type in same file', () => {
    const content = [
      `type Mode = 'edit' | 'drag';`,
      `if (mode === 'edit') { enableEditing(); }`,
      `if (mode === 'edit') { showToolbar(); }`,
      `if (mode === 'edit') { focusInput(); }`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.equal(detections.length, 0, 'Strings from union type declarations should be exempt');
  });
});

// ---------------------------------------------------------------------------
// Case label exemption
// ---------------------------------------------------------------------------
describe('magic-strings-sniffer — case label exemption', () => {
  it('does NOT flag strings that appear as case labels even when used in comparisons', () => {
    const content = [
      `if (status === 'pending') { notify(); }`,
      `if (status === 'pending') { log(); }`,
      `switch (status) {`,
      `  case 'pending': return 'waiting';`,
      `}`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.equal(detections.length, 0, 'Strings appearing as case labels should be exempt');
  });

  it('does NOT flag discriminated union strings used in both case and conditionals', () => {
    const content = [
      `switch (mode) {`,
      `  case 'edit': return renderEdit();`,
      `  case 'view': return renderView();`,
      `  case 'drag': return renderDrag();`,
      `}`,
      `if (mode === 'edit') { enableToolbar(); }`,
      `if (mode === 'edit') { showCursor(); }`,
      `if (mode === 'edit') { focusInput(); }`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.equal(detections.length, 0, 'Case label discriminators should be exempt');
  });

  it('does NOT flag default ignored strings like "all" and "none"', () => {
    const content = [
      `if (filter === 'all') { showAll(); }`,
      `if (filter === 'all') { resetPage(); }`,
      `if (filter === 'all') { clearSearch(); }`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.equal(detections.length, 0, 'Default ignored strings should not be flagged');
  });

  it('still detects strings with 3+ conditional occurrences and no case label', () => {
    const content = [
      `if (instruction.status === 'ACTIVE') { enable(); }`,
      `if (instruction.status === 'ACTIVE') { highlight(); }`,
      `if (instruction.status === 'ACTIVE') { log(); }`,
    ].join('\n');
    const detections = sniffer.detect(content, 'test.ts', {});
    assert.ok(detections.length > 0, 'Strings without case labels should still be flagged');
  });
});

// ---------------------------------------------------------------------------
// V4 false positive fixes
// ---------------------------------------------------------------------------
describe('magic-strings-sniffer — V4 false positive fixes', () => {
  it('does NOT flag method call return value comparisons like .getIsSorted() === "asc"', () => {
    const content = [
      `onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}`,
      `onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}`,
      `onClick(() => column.toggleSorting(column.getIsSorted() === 'asc'))`,
    ].join('\n');
    const detections = sniffer.detect(content, 'table.tsx', {});
    assert.equal(detections.length, 0, 'Method call return value comparisons should not be flagged');
  });

  it('does NOT flag interface property union types like flowState: "idle" | "extracting"', () => {
    const content = [
      `interface Props {`,
      `  flowState: 'idle' | 'extracting' | 'complete';`,
      `}`,
      `if (flowState === 'idle') { reset(); }`,
      `if (flowState === 'idle') { clearUI(); }`,
      `if (flowState === 'idle') { showDefault(); }`,
    ].join('\n');
    const detections = sniffer.detect(content, 'component.tsx', {});
    assert.equal(detections.length, 0, 'Interface property union values should be exempt');
  });

  it('does NOT flag param union types like (mode: "edit" | "view") =>', () => {
    const content = [
      `function render(mode: 'edit' | 'view' | 'drag') {`,
      `  if (mode === 'edit') { enableEditing(); }`,
      `  if (mode === 'edit') { showToolbar(); }`,
      `  if (mode === 'edit') { focusInput(); }`,
      `}`,
    ].join('\n');
    const detections = sniffer.detect(content, 'renderer.tsx', {});
    assert.equal(detections.length, 0, 'Parameter union type values should be exempt');
  });

  it('does NOT flag typeof comparisons — language primitives', () => {
    const content = [
      `if (typeof answer.value === 'string' || typeof answer.value === 'boolean') {`,
      `  initial.set(answer.inputId, answer.value);`,
      `}`,
      `if (typeof answer.value === 'string' || typeof answer.value === 'boolean') {`,
      `  saved.set(answer.inputId, answer.value);`,
      `}`,
      `if (typeof answer.value === 'string' || typeof answer.value === 'boolean') {`,
      `  final.set(answer.inputId, answer.value);`,
      `}`,
    ].join('\n');
    const detections = sniffer.detect(content, 'component.tsx', {});
    assert.equal(detections.length, 0, 'typeof checks are language primitives, not magic strings');
  });

  it('still flags cross-file strings not declared as union types', () => {
    const content = [
      `if (mode === 'edit') { enableEditing(); }`,
      `if (mode === 'edit') { showToolbar(); }`,
      `if (mode === 'edit') { focusInput(); }`,
    ].join('\n');
    const detections = sniffer.detect(content, 'renderer.tsx', {});
    assert.ok(detections.length > 0, 'Strings without union declaration in file should still be flagged');
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
