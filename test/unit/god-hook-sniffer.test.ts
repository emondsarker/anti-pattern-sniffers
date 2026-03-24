import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'god-hook');

import sniffer from '../../src/sniffers/react/god-hook-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('god-hook-sniffer — true positives', () => {
  it('detects bloated-hook.js (6 useState, 4 useEffect)', () => {
    const content = loadFixture('bloated-hook.js');
    const detections = sniffer.detect(content, 'bloated-hook.js', {});
    assert.equal(detections.length, 1);

    const d = detections[0];
    assert.equal(d.snifferName, 'god-hook');
    assert.ok(d.message.includes('useUserDashboard'));
    assert.ok(d.message.includes('6 useState'));
    assert.ok(d.message.includes('4 useEffect'));
  });

  it('detects useMonolith in mixed-hooks.js (5 useState, 4 useEffect)', () => {
    const content = loadFixture('mixed-hooks.js');
    const detections = sniffer.detect(content, 'mixed-hooks.js', {});
    const monolith = detections.find(d =>
      d.message.includes('useMonolith'),
    );
    assert.ok(monolith, 'useMonolith should be detected');
    assert.ok(monolith.message.includes('5 useState'));
    assert.ok(monolith.message.includes('4 useEffect'));
  });

  it('detects god hook with excessive total hooks', () => {
    const content = loadFixture('bloated-hook.js');
    const detections = sniffer.detect(content, 'bloated-hook.js', {});
    const d = detections[0];
    const details = d.details as Record<string, unknown>;
    assert.ok((details.totalHooks as number) > 10, 'totalHooks should exceed default threshold of 10');
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('god-hook-sniffer — true negatives', () => {
  it('does NOT flag lean-hook.js (1 useState, 1 useEffect)', () => {
    const content = loadFixture('lean-hook.js');
    const detections = sniffer.detect(content, 'lean-hook.js', {});
    assert.equal(detections.length, 0);
  });

  it('does NOT flag useToggle in mixed-hooks.js (1 useState, 1 useCallback)', () => {
    const content = loadFixture('mixed-hooks.js');
    const detections = sniffer.detect(content, 'mixed-hooks.js', {});
    const toggle = detections.find(d =>
      d.message.includes('useToggle'),
    );
    assert.equal(toggle, undefined, 'useToggle should not be flagged');
  });

  it('does NOT flag useWithComments in edge-cases.js (commented-out hooks)', () => {
    const content = loadFixture('edge-cases.js');
    const detections = sniffer.detect(content, 'edge-cases.js', {});
    const withComments = detections.find(d =>
      d.message.includes('useWithComments'),
    );
    assert.equal(withComments, undefined, 'useWithComments should not be flagged');
  });

  it('does NOT flag useStringRefs in edge-cases.js (hooks in strings)', () => {
    const content = loadFixture('edge-cases.js');
    const detections = sniffer.detect(content, 'edge-cases.js', {});
    const stringRefs = detections.find(d =>
      d.message.includes('useStringRefs'),
    );
    assert.equal(stringRefs, undefined, 'useStringRefs should not be flagged');
  });

  it('does NOT flag useful() in edge-cases.js (not a hook)', () => {
    const content = loadFixture('edge-cases.js');
    const detections = sniffer.detect(content, 'edge-cases.js', {});
    const useful = detections.find(d =>
      d.message.includes('useful'),
    );
    assert.equal(useful, undefined, 'useful() should not be flagged — it is not a hook');
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('god-hook-sniffer — configuration', () => {
  it('respects custom maxUseState threshold of 2', () => {
    const content = loadFixture('lean-hook.js');
    // lean-hook has 1 useState — not flagged at default (4) but not at 2 either.
    // mixed-hooks useToggle has 1 useState — same story.
    // Use mixed-hooks useMonolith (5 useState): with threshold 2, still flagged.
    const mixed = loadFixture('mixed-hooks.js');
    const detections = sniffer.detect(mixed, 'mixed-hooks.js', { maxUseState: 2 });
    const monolith = detections.find(d => d.message.includes('useMonolith'));
    assert.ok(monolith, 'useMonolith should be flagged with maxUseState=2');

    // useToggle has 1 useState — should still not be flagged even at threshold 2
    const toggle = detections.find(d => d.message.includes('useToggle'));
    assert.equal(toggle, undefined, 'useToggle should not be flagged');
  });

  it('respects custom maxUseEffect threshold of 1', () => {
    // lean-hook has 1 useEffect — at threshold 1 it is NOT flagged (> not >=)
    const content = loadFixture('lean-hook.js');
    const detections = sniffer.detect(content, 'lean-hook.js', { maxUseEffect: 1 });
    assert.equal(detections.length, 0, 'lean-hook (1 useEffect) should not be flagged at threshold 1');

    // bloated-hook has 4 useEffect — at threshold 1 it IS flagged
    const bloated = loadFixture('bloated-hook.js');
    const bloatedDetections = sniffer.detect(bloated, 'bloated-hook.js', { maxUseEffect: 1 });
    assert.ok(bloatedDetections.length > 0, 'bloated-hook should be flagged at maxUseEffect=1');
  });

  it('respects custom maxTotalHooks threshold of 5', () => {
    // mixed-hooks useMonolith has 9 total hooks — should be flagged at threshold 5
    const content = loadFixture('mixed-hooks.js');
    const detections = sniffer.detect(content, 'mixed-hooks.js', { maxTotalHooks: 5 });
    const monolith = detections.find(d => d.message.includes('useMonolith'));
    assert.ok(monolith, 'useMonolith (9 total) should be flagged at maxTotalHooks=5');
  });

  it('uses default thresholds when no config provided', () => {
    const content = loadFixture('bloated-hook.js');
    const detections = sniffer.detect(content, 'bloated-hook.js', {});
    assert.equal(detections.length, 1);
    const details = detections[0].details as Record<string, unknown>;
    const thresholds = details.thresholds as Record<string, number>;
    assert.equal(thresholds.maxUseState, 4);
    assert.equal(thresholds.maxUseEffect, 3);
    assert.equal(thresholds.maxTotalHooks, 10);
  });

  it('does NOT flag hook at exactly the threshold', () => {
    // useMonolith has 5 useState — set maxUseState to 5, should NOT flag for useState
    // useMonolith has 4 useEffect — set maxUseEffect to 4, should NOT flag for useEffect
    // useMonolith has 9 total — set maxTotalHooks to 9, should NOT flag for total
    const content = loadFixture('mixed-hooks.js');
    const detections = sniffer.detect(content, 'mixed-hooks.js', {
      maxUseState: 5,
      maxUseEffect: 4,
      maxTotalHooks: 9,
    });
    const monolith = detections.find(d => d.message.includes('useMonolith'));
    assert.equal(monolith, undefined, 'hook at exactly the threshold should not be flagged');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('god-hook-sniffer — edge cases', () => {
  it('handles empty file content (returns [])', () => {
    const detections = sniffer.detect('', 'empty.js', {});
    assert.deepEqual(detections, []);
  });

  it('handles file with no hooks (returns [])', () => {
    const content = `
function add(a, b) { return a + b; }
const multiply = (a, b) => a * b;
export { add, multiply };
`;
    const detections = sniffer.detect(content, 'no-hooks.js', {});
    assert.deepEqual(detections, []);
  });

  it('multiple hooks in one file — detects only the god hook(s)', () => {
    const content = loadFixture('mixed-hooks.js');
    const detections = sniffer.detect(content, 'mixed-hooks.js', {});
    // Should detect useMonolith but NOT useToggle
    assert.equal(detections.length, 1);
    assert.ok(detections[0].message.includes('useMonolith'));
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('god-hook-sniffer — output shape', () => {
  it('returns Detection objects with snifferName "god-hook"', () => {
    const content = loadFixture('bloated-hook.js');
    const detections = sniffer.detect(content, 'bloated-hook.js', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'god-hook');
    }
  });

  it('returns Detection objects with valid line numbers', () => {
    const content = loadFixture('bloated-hook.js');
    const detections = sniffer.detect(content, 'bloated-hook.js', {});
    assert.equal(detections.length, 1);
    // useUserDashboard is declared on line 3
    assert.equal(detections[0].line, 3);

    const mixed = loadFixture('mixed-hooks.js');
    const mixedDetections = sniffer.detect(mixed, 'mixed-hooks.js', {});
    const monolith = mixedDetections.find(d => d.message.includes('useMonolith'));
    assert.ok(monolith);
    // useMonolith is declared on line 4
    assert.equal(monolith.line, 4);
  });

  it('returns Detection objects with hook name in message', () => {
    const content = loadFixture('bloated-hook.js');
    const detections = sniffer.detect(content, 'bloated-hook.js', {});
    assert.ok(detections[0].message.includes('useUserDashboard'));
  });

  it('returns Detection details with individual hook counts', () => {
    const content = loadFixture('bloated-hook.js');
    const detections = sniffer.detect(content, 'bloated-hook.js', {});
    const details = detections[0].details as Record<string, unknown>;

    assert.equal(details.hookName, 'useUserDashboard');
    assert.equal(details.useStateCount, 6);
    assert.equal(details.useEffectCount, 4);
    assert.equal(details.useCallbackCount, 1);
    assert.equal(details.useMemoCount, 1);
    assert.equal(details.useRefCount, 2);
    assert.equal(details.totalHooks, 14);
  });
});
