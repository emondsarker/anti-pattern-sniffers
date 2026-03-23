import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { discoverFiles } from '../../src/core/file-discoverer.js';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'files');

describe('file-discoverer — include patterns', () => {
  it('finds .jsx files matching include pattern', () => {
    const files = discoverFiles(['**/*.jsx'], [], FIXTURES_DIR);
    const basenames = files.map(f => f.split('/').pop());
    assert.ok(basenames.includes('App.jsx'), 'Should find App.jsx');
    assert.ok(basenames.includes('Child.jsx'), 'Should find Child.jsx in subdir');
  });

  it('finds .tsx files matching include pattern', () => {
    const files = discoverFiles(['**/*.tsx'], [], FIXTURES_DIR);
    const basenames = files.map(f => f.split('/').pop());
    assert.ok(basenames.includes('Header.tsx'), 'Should find Header.tsx');
    assert.ok(basenames.includes('Deep.tsx'), 'Should find Deep.tsx in nested subdir');
  });
});

describe('file-discoverer — exclude patterns', () => {
  it('excludes node_modules by default', () => {
    const files = discoverFiles(['**/*.jsx'], ['node_modules'], FIXTURES_DIR);
    const inNodeModules = files.filter(f => f.includes('node_modules'));
    assert.equal(inNodeModules.length, 0, 'Should not include node_modules files');
  });

  it('excludes test files matching exclude pattern', () => {
    const files = discoverFiles(['**/*.jsx'], ['**/*.test.*'], FIXTURES_DIR);
    const testFiles = files.filter(f => f.includes('.test.'));
    assert.equal(testFiles.length, 0, 'Should not include test files');
  });
});

describe('file-discoverer — edge cases', () => {
  it('returns empty array for directory with no matching files', () => {
    const files = discoverFiles(['**/*.py'], [], FIXTURES_DIR);
    assert.deepEqual(files, []);
  });

  it('returns absolute file paths', () => {
    const files = discoverFiles(['**/*.jsx'], [], FIXTURES_DIR);
    assert.ok(files.length > 0, 'Should find at least one file');
    for (const f of files) {
      assert.ok(f.startsWith('/'), `Expected absolute path, got: ${f}`);
    }
  });
});

describe('file-discoverer — brace expansion', () => {
  it('handles {jsx,tsx} brace expansion in include patterns', () => {
    const files = discoverFiles(['**/*.{jsx,tsx}'], ['node_modules'], FIXTURES_DIR);
    const basenames = files.map(f => f.split('/').pop());
    assert.ok(basenames.includes('App.jsx'), 'Should find .jsx file');
    assert.ok(basenames.includes('Header.tsx'), 'Should find .tsx file');
    // Should not include .js files
    assert.ok(!basenames.includes('utils.js'), 'Should not include .js files');
  });
});

describe('file-discoverer — recursive glob', () => {
  it('handles ** glob for recursive directories', () => {
    const files = discoverFiles(['**/*.tsx'], [], FIXTURES_DIR);
    const basenames = files.map(f => f.split('/').pop());
    assert.ok(basenames.includes('Deep.tsx'), 'Should find deeply nested file');
  });
});
