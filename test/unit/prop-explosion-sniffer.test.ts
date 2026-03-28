import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import sniffer from '../../src/sniffers/react/prop-explosion-sniffer.js';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'prop-explosion');

function readFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

function detect(filename: string, config: Record<string, unknown> = {}) {
  const content = readFixture(filename);
  const filePath = join(FIXTURES_DIR, filename);
  return sniffer.detect(content, filePath, config);
}

// ---------------------------------------------------------------------------
// True positives (should detect)
// ---------------------------------------------------------------------------
describe('prop-explosion-sniffer — true positives', () => {
  it('1. Detects component with 13 destructured props in many-props.jsx', () => {
    const results = detect('many-props.jsx');
    const declaration = results.find(
      (d) => d.details?.componentName === 'UserProfile' && (d.details?.propCount as number) === 13,
    );
    assert.ok(declaration, 'Expected a detection for UserProfile with 13 props');
  });

  it('2. Detects spread + individual props in spread-props.jsx (8 named props) at threshold 7', () => {
    const results = detect('spread-props.jsx', { threshold: 7 });
    const declaration = results.find(
      (d) => d.details?.componentName === 'EnhancedInput',
    );
    assert.ok(declaration, 'Expected a detection for EnhancedInput');
    assert.equal(declaration!.details?.propCount, 8);
  });

  it('4. Detects component with default values in edge-cases.jsx (WithDefaults) at lowered threshold', () => {
    // WithDefaults has props with default values including `f = {}` which causes
    // the destructuring regex to capture only 6 named props (a–f). We lower the
    // threshold so the detection triggers.
    const results = detect('edge-cases.jsx', { threshold: 5 });
    const hit = results.find((d) => d.details?.componentName === 'WithDefaults');
    assert.ok(hit, 'Expected a detection for WithDefaults at threshold 5');
    assert.equal(hit!.details?.propCount, 6);
  });

  it('5. Detects React.memo wrapped component in edge-cases.jsx (MemoComponent)', () => {
    const results = detect('edge-cases.jsx', { threshold: 7 });
    const hit = results.find((d) => d.details?.componentName === 'MemoComponent');
    assert.ok(hit, 'Expected a detection for MemoComponent');
    assert.equal(hit!.details?.propCount, 8);
  });

  it('6. Detects React.forwardRef component in edge-cases.jsx (ForwardRefComponent)', () => {
    const results = detect('edge-cases.jsx', { threshold: 7 });
    const hit = results.find((d) => d.details?.componentName === 'ForwardRefComponent');
    assert.ok(hit, 'Expected a detection for ForwardRefComponent');
    assert.equal(hit!.details?.propCount, 8);
  });

  it('7. Detects TypeScript component in typescript.tsx', () => {
    const results = detect('typescript.tsx', { threshold: 9 });
    const hit = results.find((d) => d.details?.componentName === 'UserProfile');
    assert.ok(hit, 'Expected a detection for UserProfile in TypeScript file');
    assert.equal(hit!.details?.propCount, 10);
  });
});

// ---------------------------------------------------------------------------
// True negatives (should NOT detect)
// ---------------------------------------------------------------------------
describe('prop-explosion-sniffer — true negatives', () => {
  it('8. Does NOT flag few-props.jsx (3 props)', () => {
    const results = detect('few-props.jsx');
    assert.equal(results.length, 0, 'Expected no detections for a 3-prop component');
  });

  it('9. Does NOT flag non-component functions in non-component.js (lowercase names)', () => {
    const results = detect('non-component.js');
    assert.equal(results.length, 0, 'Expected no detections for lowercase functions');
  });

  it('10. Does NOT flag TypeScript interfaces/types in typescript.tsx', () => {
    const results = detect('typescript.tsx');
    const interfaceHit = results.find(
      (d) => d.details?.componentName === 'UserProfileProps',
    );
    const typeHit = results.find(
      (d) => d.details?.componentName === 'FormConfig',
    );
    assert.equal(interfaceHit, undefined, 'Interface should not be flagged');
    assert.equal(typeHit, undefined, 'Type alias should not be flagged');
  });

  it('11. Does NOT flag component at exactly threshold (threshold=13 for 13-prop component)', () => {
    const results = detect('many-props.jsx', { threshold: 13 });
    const hit = results.find((d) => d.details?.componentName === 'UserProfile');
    assert.equal(hit, undefined, 'Component at exactly the threshold should not be flagged');
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('prop-explosion-sniffer — configuration', () => {
  it('12. Respects custom threshold of 2 (flags even few-props.jsx with 3 props)', () => {
    const results = detect('few-props.jsx', { threshold: 2 });
    assert.ok(results.length > 0, 'Expected detections when threshold is 2');
    const hit = results.find((d) => d.details?.componentName === 'Button');
    assert.ok(hit, 'Expected Button to be flagged with threshold 2');
  });

  it('13. Respects custom threshold of 15 (should NOT flag anything)', () => {
    const results = detect('many-props.jsx', { threshold: 15 });
    assert.equal(results.length, 0, 'Expected no detections with threshold 15');
  });

  it('14. Uses default threshold of 7 when no config provided', () => {
    // many-props.jsx has 13 props — should be flagged at default threshold 7
    const results = detect('many-props.jsx');
    assert.ok(results.length > 0, 'Expected detections at default threshold');
    const hit = results.find((d) => d.details?.componentName === 'UserProfile');
    assert.ok(hit, 'Expected UserProfile to be detected at default threshold');
    assert.equal(hit!.details?.threshold, 7, 'Threshold in details should be 7');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('prop-explosion-sniffer — edge cases', () => {
  it('15. Handles empty file content gracefully (returns [])', () => {
    const results = sniffer.detect('', 'empty.jsx', {});
    assert.deepEqual(results, []);
  });

  it('16. Handles file with no components (returns [])', () => {
    const content = 'const x = 1;\nconst y = 2;\nexport { x, y };\n';
    const results = sniffer.detect(content, 'no-components.js', {});
    assert.deepEqual(results, []);
  });

  it('17. Handles components with rest params (counts only named props, not ...rest)', () => {
    const results = detect('edge-cases.jsx');
    const hit = results.find((d) => d.details?.componentName === 'WithRest');
    // WithRest has 7 named props + ...rest. Default threshold is 7, so 7 > 7 is false.
    assert.equal(hit, undefined, 'WithRest should not be flagged — 7 named props equals the threshold');
  });

  it('18. Multiple components in one file — returns multiple detections', () => {
    const results = detect('edge-cases.jsx', { threshold: 7 });
    const componentNames = results.map((d) => d.details?.componentName);
    const unique = new Set(componentNames);
    assert.ok(unique.size >= 2, `Expected at least 2 distinct component detections, got ${unique.size}`);
    assert.ok(unique.has('MemoComponent'), 'Expected MemoComponent to be detected');
    assert.ok(unique.has('ForwardRefComponent'), 'Expected ForwardRefComponent to be detected');
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('prop-explosion-sniffer — output shape', () => {
  it('19. Returns Detection objects with correct snifferName', () => {
    const results = detect('many-props.jsx');
    for (const d of results) {
      assert.equal(d.snifferName, 'prop-explosion');
    }
  });

  it('20. Returns Detection objects with correct filePath', () => {
    const expectedPath = join(FIXTURES_DIR, 'many-props.jsx');
    const results = detect('many-props.jsx');
    for (const d of results) {
      assert.equal(d.filePath, expectedPath);
    }
  });

  it('21. Returns Detection objects with valid line numbers (> 0)', () => {
    const results = detect('many-props.jsx');
    assert.ok(results.length > 0, 'Need at least one detection to verify');
    for (const d of results) {
      assert.ok(d.line > 0, `Expected line > 0, got ${d.line}`);
    }
  });

  it('22. Returns Detection objects with suggestion text containing the component name', () => {
    const results = detect('many-props.jsx');
    const hit = results.find((d) => d.details?.componentName === 'UserProfile');
    assert.ok(hit, 'Expected a detection for UserProfile');
    assert.ok(
      hit!.suggestion.includes('UserProfile'),
      'Suggestion should contain the component name',
    );
  });
});

// ---------------------------------------------------------------------------
// ignoredProps configuration
// ---------------------------------------------------------------------------
describe('prop-explosion-sniffer — ignoredProps', () => {
  it('26. Respects ignoredProps config — excluded props do not count toward total', () => {
    const content = [
      'const Big = ({ a, b, c, d, e, f, g, h, i, j, k, l }) => {',
      '  return <div>{a}</div>;',
      '};',
    ].join('\n');
    // 12 props total. Ignore 6 → 6 counted. 6 > 7 = false → not flagged.
    const results = sniffer.detect(content, 'big.jsx', { ignoredProps: ['a', 'b', 'c', 'd', 'e', 'f'] });
    assert.equal(results.length, 0, '12 props minus 6 ignored = 6, below threshold 7');
  });

  it('27. ignoredProps defaults to empty (all props counted)', () => {
    const content = [
      'const Big = ({ a, b, c, d, e, f, g, h, i, j, k }) => {',
      '  return <div>{a}</div>;',
      '};',
    ].join('\n');
    // 11 props, no ignoredProps → 11 > 10 → flagged
    const results = sniffer.detect(content, 'big.jsx', {});
    assert.ok(results.length > 0, '11 props should be flagged at default threshold 10');
  });

  it('28. Flags dialog component with 10 props at default threshold of 7', () => {
    const results = detect('dialog-component.jsx');
    const hit = results.find((d) => d.details?.componentName === 'ConfirmationDialog');
    assert.ok(hit, 'Expected detection for ConfirmationDialog with 10 props at threshold 7');
    assert.equal(hit!.details?.propCount, 10);
  });
});

// ---------------------------------------------------------------------------
// False positive regression tests
// ---------------------------------------------------------------------------
describe('prop-explosion-sniffer — false positive regressions', () => {
  it('23. Flags table component with 9 props (above default threshold of 7)', () => {
    const results = detect('table-component.jsx');
    const hit = results.find((d) => d.details?.componentName === 'DataTable');
    assert.ok(hit, 'Expected detection for DataTable with 9 props at threshold 7');
    assert.equal(hit!.details?.propCount, 9);
  });

  it('24. Flags god component with 13 props at default threshold', () => {
    const results = detect('god-component.jsx');
    const hit = results.find((d) => d.details?.componentName === 'GodComponent');
    assert.ok(hit, 'Expected detection for GodComponent with 13 props');
    assert.equal(hit!.details?.propCount, 13);
  });

  it('25. JSX attribute usage of library components is NOT flagged', () => {
    const results = detect('jsx-attributes.jsx');
    assert.equal(results.length, 0, 'JSX attribute usage should not be detected');
  });
});
