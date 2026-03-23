import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBracedBlock,
  getLineNumber,
  getColumnNumber,
  countMatches,
  stripCommentsAndStrings,
  parseDestructuredProps,
} from '../../src/utils/regex-helpers.js';

// ---------------------------------------------------------------------------
// extractBracedBlock
// ---------------------------------------------------------------------------
describe('extractBracedBlock — balanced braces', () => {
  it('extracts a balanced brace block', () => {
    const source = 'function foo() { return 1; }';
    const idx = source.indexOf('{');
    const result = extractBracedBlock(source, idx);
    assert.equal(result, '{ return 1; }');
  });
});

describe('extractBracedBlock — unbalanced braces', () => {
  it('returns null for unbalanced braces', () => {
    const source = 'function foo() { return 1;';
    const idx = source.indexOf('{');
    const result = extractBracedBlock(source, idx);
    assert.equal(result, null);
  });
});

describe('extractBracedBlock — nested braces', () => {
  it('handles nested braces correctly', () => {
    const source = '{ const obj = { a: { b: 1 } }; }';
    const result = extractBracedBlock(source, 0);
    assert.equal(result, source);
  });
});

describe('extractBracedBlock — braces in strings/comments', () => {
  it('ignores braces inside string literals', () => {
    const source = '{ const s = "{"; }';
    const result = extractBracedBlock(source, 0);
    assert.equal(result, '{ const s = "{"; }');
  });

  it('ignores braces inside line comments', () => {
    const source = '{ // {\n const x = 1; }';
    const result = extractBracedBlock(source, 0);
    assert.equal(result, source);
  });

  it('ignores braces inside block comments', () => {
    const source = '{ /* { */ const x = 1; }';
    const result = extractBracedBlock(source, 0);
    assert.equal(result, source);
  });
});

// ---------------------------------------------------------------------------
// getLineNumber
// ---------------------------------------------------------------------------
describe('getLineNumber', () => {
  it('returns correct line number for a character offset', () => {
    const source = 'line1\nline2\nline3';
    // 'l' of "line3" is at index 12
    assert.equal(getLineNumber(source, 0), 1, 'First char is line 1');
    assert.equal(getLineNumber(source, 6), 2, 'Start of line2 is line 2');
    assert.equal(getLineNumber(source, 12), 3, 'Start of line3 is line 3');
  });
});

// ---------------------------------------------------------------------------
// getColumnNumber
// ---------------------------------------------------------------------------
describe('getColumnNumber', () => {
  it('returns correct column number for a character offset', () => {
    const source = 'abcdef\nghijkl';
    // 'g' is at index 7, should be column 1
    assert.equal(getColumnNumber(source, 7), 1, 'First char of second line is column 1');
    // 'h' is at index 8, should be column 2
    assert.equal(getColumnNumber(source, 8), 2, 'Second char of second line is column 2');
    // 'a' is at index 0, should be column 1
    assert.equal(getColumnNumber(source, 0), 1, 'First char of first line is column 1');
  });
});

// ---------------------------------------------------------------------------
// countMatches
// ---------------------------------------------------------------------------
describe('countMatches', () => {
  it('counts regex matches in a string', () => {
    const source = 'useState() useState() useState()';
    const count = countMatches(source, /useState\(\)/g);
    assert.equal(count, 3);
  });

  it('returns 0 when no matches', () => {
    const count = countMatches('no hooks here', /useState\(\)/g);
    assert.equal(count, 0);
  });
});

// ---------------------------------------------------------------------------
// stripCommentsAndStrings
// ---------------------------------------------------------------------------
describe('stripCommentsAndStrings — line comments', () => {
  it('strips line comments', () => {
    const source = 'const x = 1; // this is a comment\nconst y = 2;';
    const stripped = stripCommentsAndStrings(source);
    assert.ok(!stripped.includes('this is a comment'), 'Line comment should be removed');
    assert.ok(stripped.includes('const x = 1;'), 'Code before comment preserved');
    assert.ok(stripped.includes('const y = 2;'), 'Code on next line preserved');
  });
});

describe('stripCommentsAndStrings — block comments', () => {
  it('strips block comments', () => {
    const source = 'const x = 1; /* block comment */ const y = 2;';
    const stripped = stripCommentsAndStrings(source);
    assert.ok(!stripped.includes('block comment'), 'Block comment should be removed');
    assert.ok(stripped.includes('const x = 1;'), 'Code before comment preserved');
    assert.ok(stripped.includes('const y = 2;'), 'Code after comment preserved');
  });
});

// ---------------------------------------------------------------------------
// parseDestructuredProps
// ---------------------------------------------------------------------------
describe('parseDestructuredProps', () => {
  it('extracts prop names correctly', () => {
    const result = parseDestructuredProps(' a, b, c ');
    assert.deepEqual(result, ['a', 'b', 'c']);
  });

  it('handles default values', () => {
    const result = parseDestructuredProps(" a, b = 'default', c ");
    assert.deepEqual(result, ['a', 'b', 'c']);
  });

  it('handles renames (colon syntax)', () => {
    const result = parseDestructuredProps(' a: renamedA, b ');
    assert.deepEqual(result, ['a', 'b']);
  });

  it('excludes rest params', () => {
    const result = parseDestructuredProps(' a, b, ...rest ');
    assert.deepEqual(result, ['a', 'b']);
  });
});
