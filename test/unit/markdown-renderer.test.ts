import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../../src/output/markdown-renderer.js';
import type { SnifferResult } from '../../src/sniffers/sniffer-interface.js';

function makeResult(overrides: Partial<{
  snifferName: string;
  filePath: string;
  line: number;
  column: number;
  message: string;
  severity: string;
  suggestion: string;
}> = {}): SnifferResult {
  return {
    snifferName: overrides.snifferName ?? 'prop-explosion',
    filePath: overrides.filePath ?? 'src/App.jsx',
    detections: [
      {
        snifferName: overrides.snifferName ?? 'prop-explosion',
        filePath: overrides.filePath ?? 'src/App.jsx',
        line: overrides.line ?? 10,
        column: overrides.column ?? 1,
        message: overrides.message ?? 'Too many props',
        severity: (overrides.severity as 'warning') ?? 'warning',
        suggestion: overrides.suggestion ?? 'Consider grouping props into an object.',
      },
    ],
    durationMs: 5,
    error: null,
  };
}

function emptyResults(): Map<string, SnifferResult[]> {
  const map = new Map<string, SnifferResult[]>();
  map.set('src/App.jsx', [
    {
      snifferName: 'prop-explosion',
      filePath: 'src/App.jsx',
      detections: [],
      durationMs: 1,
      error: null,
    },
  ]);
  return map;
}

describe('markdown-renderer — clean report', () => {
  it('reports "No anti-patterns detected!" when there are no detections', () => {
    const output = renderMarkdown(emptyResults(), {});
    assert.ok(output.includes('No anti-patterns detected!'));
  });
});

describe('markdown-renderer — file sections', () => {
  it('includes file path as section heading', () => {
    const results = new Map<string, SnifferResult[]>();
    results.set('src/App.jsx', [makeResult()]);
    const output = renderMarkdown(results, {});
    assert.ok(output.includes('`src/App.jsx`'), 'Should include file path in output');
  });
});

describe('markdown-renderer — summary table', () => {
  it('includes summary table with sniffer name', () => {
    const results = new Map<string, SnifferResult[]>();
    results.set('src/App.jsx', [makeResult()]);
    const output = renderMarkdown(results, {});
    assert.ok(output.includes('## Summary'), 'Should include Summary heading');
    assert.ok(output.includes('| Sniffer |'), 'Should include table header');
    assert.ok(output.includes('prop-explosion'), 'Should include sniffer name in table');
  });
});

describe('markdown-renderer — sniffer name in heading', () => {
  it('includes formatted sniffer name in detection heading', () => {
    const results = new Map<string, SnifferResult[]>();
    results.set('src/App.jsx', [makeResult()]);
    const output = renderMarkdown(results, {});
    // "prop-explosion" should be formatted as "Prop Explosion"
    assert.ok(output.includes('Prop Explosion'), 'Should include formatted sniffer name');
  });
});

describe('markdown-renderer — line number', () => {
  it('includes line number in detection heading', () => {
    const results = new Map<string, SnifferResult[]>();
    results.set('src/App.jsx', [makeResult({ line: 42 })]);
    const output = renderMarkdown(results, {});
    assert.ok(output.includes('line 42'), 'Should include line number');
  });
});

describe('markdown-renderer — suggestion text', () => {
  it('includes suggestion text in output', () => {
    const results = new Map<string, SnifferResult[]>();
    const suggestion = 'Consider grouping props into an object.';
    results.set('src/App.jsx', [makeResult({ suggestion })]);
    const output = renderMarkdown(results, {});
    assert.ok(output.includes(suggestion), 'Should include suggestion text');
    assert.ok(output.includes('**Suggestion:**'), 'Should include Suggestion label');
  });
});

describe('markdown-renderer — multiple files', () => {
  it('creates separate sections for multiple files', () => {
    const results = new Map<string, SnifferResult[]>();
    results.set('src/App.jsx', [makeResult({ filePath: 'src/App.jsx' })]);
    results.set('src/Header.tsx', [makeResult({ filePath: 'src/Header.tsx' })]);
    const output = renderMarkdown(results, {});
    assert.ok(output.includes('`src/App.jsx`'), 'Should include first file');
    assert.ok(output.includes('`src/Header.tsx`'), 'Should include second file');
  });
});

describe('markdown-renderer — multiple sniffers in summary', () => {
  it('shows multiple sniffers in summary table', () => {
    const results = new Map<string, SnifferResult[]>();
    results.set('src/App.jsx', [
      makeResult({ snifferName: 'prop-explosion', filePath: 'src/App.jsx' }),
      makeResult({ snifferName: 'god-hook', filePath: 'src/App.jsx' }),
    ]);
    const output = renderMarkdown(results, {});
    assert.ok(output.includes('prop-explosion'), 'Should include prop-explosion in summary');
    assert.ok(output.includes('god-hook'), 'Should include god-hook in summary');
  });
});
