import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import sniffer from '../../src/sniffers/react/prop-drilling-sniffer.js';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'prop-drilling');

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
describe('prop-drilling-sniffer — true positives', () => {
  it('1. Detects pass-through props in Wrapper of deep-drilling.jsx', () => {
    const results = detect('deep-drilling.jsx');
    const wrapperHits = results.filter(
      (d) => d.details?.componentName === 'Wrapper',
    );
    assert.ok(wrapperHits.length >= 5, `Expected at least 5 detections for Wrapper, got ${wrapperHits.length}`);
    const flaggedProps = wrapperHits.map((d) => d.details?.propName);
    assert.ok(flaggedProps.includes('theme'), 'Expected theme to be flagged');
    assert.ok(flaggedProps.includes('locale'), 'Expected locale to be flagged');
    assert.ok(flaggedProps.includes('userId'), 'Expected userId to be flagged');
    assert.ok(flaggedProps.includes('permissions'), 'Expected permissions to be flagged');
    assert.ok(flaggedProps.includes('notifications'), 'Expected notifications to be flagged');
  });

  it('2. Detects pass-through props in Header of deep-drilling.jsx', () => {
    const results = detect('deep-drilling.jsx');
    const headerHits = results.filter(
      (d) => d.details?.componentName === 'Header',
    );
    assert.ok(headerHits.length >= 5, `Expected at least 5 detections for Header, got ${headerHits.length}`);
    const flaggedProps = headerHits.map((d) => d.details?.propName);
    assert.ok(flaggedProps.includes('theme'), 'Expected theme to be flagged');
    assert.ok(flaggedProps.includes('locale'), 'Expected locale to be flagged');
    assert.ok(flaggedProps.includes('userId'), 'Expected userId to be flagged');
    assert.ok(flaggedProps.includes('permissions'), 'Expected permissions to be flagged');
    assert.ok(flaggedProps.includes('notifications'), 'Expected notifications to be flagged');
  });

  it('3. Detects multiple pass-through props in a single component', () => {
    const results = detect('deep-drilling.jsx');
    const wrapperHits = results.filter(
      (d) => d.details?.componentName === 'Wrapper',
    );
    assert.ok(wrapperHits.length >= 5, `Expected at least 5 pass-through detections, got ${wrapperHits.length}`);
  });
});

// ---------------------------------------------------------------------------
// True negatives (should NOT detect)
// ---------------------------------------------------------------------------
describe('prop-drilling-sniffer — true negatives', () => {
  it('4. Does NOT flag title in shallow-pass.jsx Card (title is used locally via {title})', () => {
    const results = detect('shallow-pass.jsx');
    const titleHit = results.find(
      (d) => d.details?.componentName === 'Card' && d.details?.propName === 'title',
    );
    assert.equal(titleHit, undefined, 'title is used locally and should not be flagged');
  });

  it('5. Does NOT flag theme and title in uses-and-passes.jsx Container (both used locally)', () => {
    const results = detect('uses-and-passes.jsx');
    const themeHit = results.find(
      (d) => d.details?.componentName === 'Container' && d.details?.propName === 'theme',
    );
    const titleHit = results.find(
      (d) => d.details?.componentName === 'Container' && d.details?.propName === 'title',
    );
    assert.equal(themeHit, undefined, 'theme is used locally (theme.bg, theme.fg) and should not be flagged');
    assert.equal(titleHit, undefined, 'title is used locally ({title}) and should not be flagged');
  });

  it('6. Does NOT flag layout-component.jsx — className, style, children, id are whitelisted', () => {
    const results = detect('layout-component.jsx');
    assert.equal(results.length, 0, 'All props in PageLayout and Sidebar are whitelisted');
  });

  it('7. Does NOT flag UserMenu in deep-drilling.jsx (it actually uses the props)', () => {
    const results = detect('deep-drilling.jsx');
    const userMenuHits = results.filter(
      (d) => d.details?.componentName === 'UserMenu',
    );
    assert.equal(userMenuHits.length, 0, 'UserMenu uses theme.primary, locale.greeting, userId directly');
  });
});

// ---------------------------------------------------------------------------
// minPassThroughProps threshold
// ---------------------------------------------------------------------------
describe('prop-drilling-sniffer — minPassThroughProps threshold', () => {
  it('does NOT flag component with only 2 pass-through props (below default threshold)', () => {
    const results = detect('many-pass-through.jsx');
    const smallWrapperHits = results.filter(
      (d) => d.details?.componentName === 'SmallWrapper',
    );
    assert.equal(smallWrapperHits.length, 0, 'SmallWrapper has only 2 pass-through props');
  });

  it('flags component with 6 pass-through props (above default threshold)', () => {
    const results = detect('many-pass-through.jsx');
    const hits = results.filter(
      (d) => d.details?.componentName === 'SettingsPanel',
    );
    assert.ok(hits.length >= 5, `Expected at least 5 detections for SettingsPanel, got ${hits.length}`);
  });

  it('respects custom minPassThroughProps=1 (flags even single pass-through)', () => {
    const results = detect('many-pass-through.jsx', { minPassThroughProps: 1 });
    const smallWrapperHits = results.filter(
      (d) => d.details?.componentName === 'SmallWrapper',
    );
    assert.ok(smallWrapperHits.length > 0, 'SmallWrapper should be flagged with threshold 1');
  });

  it('does NOT flag dialog wrapper (2 forwarded props, below threshold)', () => {
    const results = detect('dialog-wrapper.jsx');
    assert.equal(results.length, 0, 'Dialog wrapper with 2 pass-through props should not flag');
  });

  it('does NOT flag adapter component that mixes pass-through with local usage', () => {
    const results = detect('adapter-component.jsx');
    assert.equal(results.length, 0, 'Adapter with mixed usage should not flag');
  });
});

// ---------------------------------------------------------------------------
// Event handler auto-whitelisting
// ---------------------------------------------------------------------------
describe('prop-drilling-sniffer — event handler auto-whitelisting', () => {
  it('auto-whitelists on[A-Z] event handler props', () => {
    const results = detect('event-handler-passthrough.jsx');
    assert.equal(results.length, 0, 'Components with only event handler + few data pass-throughs should not flag');
  });

  it('flags component with 5+ non-handler data pass-through props', () => {
    const results = detect('many-data-passthrough.jsx');
    const hits = results.filter(
      (d) => d.details?.componentName === 'ComplianceContent',
    );
    assert.ok(hits.length >= 5, `Expected at least 5 detections for ComplianceContent, got ${hits.length}`);
  });

  it('does NOT flag isOpen, isLoading, disabled as pass-through', () => {
    const content = [
      'const ModalWrapper = ({ isOpen, isLoading, disabled, title, description, confirmText, cancelText, variant }) => {',
      '  return <BaseModal isOpen={isOpen} isLoading={isLoading} disabled={disabled}',
      '    title={title} description={description} confirmText={confirmText}',
      '    cancelText={cancelText} variant={variant} />;',
      '};',
    ].join('\n');
    const results = sniffer.detect(content, 'modal-wrapper.jsx', {});
    // isOpen, isLoading, disabled are whitelisted — only 5 data props remain, at threshold 5 → flagged
    const flaggedProps = results.map((d) => d.details?.propName);
    assert.ok(!flaggedProps.includes('isOpen'), 'isOpen should be auto-whitelisted');
    assert.ok(!flaggedProps.includes('isLoading'), 'isLoading should be auto-whitelisted');
    assert.ok(!flaggedProps.includes('disabled'), 'disabled should be auto-whitelisted');
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('prop-drilling-sniffer — configuration', () => {
  it('8. Respects custom whitelistedProps — adding theme to whitelist prevents it from being flagged', () => {
    const results = detect('deep-drilling.jsx', {
      whitelistedProps: ['className', 'style', 'children', 'key', 'ref', 'id', 'data-testid', 'theme'],
      minPassThroughProps: 1,
    });
    const themeFlagged = results.find((d) => d.details?.propName === 'theme');
    assert.equal(themeFlagged, undefined, 'theme should not be flagged when it is whitelisted');
  });

  it('9. Uses default whitelisted props (children is not flagged in Wrapper)', () => {
    const results = detect('deep-drilling.jsx');
    const childrenFlagged = results.find((d) => d.details?.propName === 'children');
    assert.equal(childrenFlagged, undefined, 'children is in default whitelist and should not be flagged');
  });

  it('10. With empty whitelist, flags className/style pass-through in layout-component.jsx', () => {
    const results = detect('layout-component.jsx', { whitelistedProps: [], minPassThroughProps: 3 });
    assert.ok(results.length > 0, 'Expected detections when whitelist is empty');
    const propNames = results.map((d) => d.details?.propName);
    assert.ok(propNames.includes('className'), 'className should be flagged with empty whitelist');
    assert.ok(propNames.includes('style'), 'style should be flagged with empty whitelist');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('prop-drilling-sniffer — edge cases', () => {
  it('11. Handles empty file content (returns [])', () => {
    const results = sniffer.detect('', 'empty.jsx', {});
    assert.deepEqual(results, []);
  });

  it('12. Handles file with no components (returns [])', () => {
    const content = 'const x = 1;\nconst y = 2;\nexport { x, y };\n';
    const results = sniffer.detect(content, 'no-components.js', {});
    assert.deepEqual(results, []);
  });

  it('13. Handles components with no destructured props (returns [])', () => {
    const content = `const MyComponent = (props) => {\n  return <div>{props.name}</div>;\n};\n`;
    const results = sniffer.detect(content, 'no-destructured.jsx', {});
    assert.deepEqual(results, []);
  });

  it('14. Props that are renamed when passed (foo={bar}) are NOT flagged as same-name pass-through', () => {
    const content = [
      'const Parent = ({ bar }) => {',
      '  return <Child foo={bar} />;',
      '};',
    ].join('\n');
    const results = sniffer.detect(content, 'renamed.jsx', {});
    // bar is passed as foo={bar}, not bar={bar}, so it is not a same-name pass-through
    const barHit = results.find((d) => d.details?.propName === 'bar');
    assert.equal(barHit, undefined, 'Renamed prop should not be flagged as pass-through');
  });

  it('15. Props used in function calls or conditions are NOT flagged', () => {
    const content = [
      'const Widget = ({ onClick, visible }) => {',
      '  if (visible) {',
      '    onClick();',
      '  }',
      '  return <div />;',
      '};',
    ].join('\n');
    const results = sniffer.detect(content, 'used-props.jsx', {});
    assert.equal(results.length, 0, 'Props used in conditions/calls should not be flagged');
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('prop-drilling-sniffer — output shape', () => {
  it('16. Returns Detection objects with snifferName "prop-drilling"', () => {
    const results = detect('deep-drilling.jsx');
    assert.ok(results.length > 0, 'Need at least one detection to verify');
    for (const d of results) {
      assert.equal(d.snifferName, 'prop-drilling');
    }
  });

  it('17. Returns Detection objects with valid line numbers (> 0)', () => {
    const results = detect('deep-drilling.jsx');
    assert.ok(results.length > 0, 'Need at least one detection to verify');
    for (const d of results) {
      assert.ok(d.line > 0, `Expected line > 0, got ${d.line}`);
    }
  });

  it('18. Returns Detection objects with prop name in message', () => {
    const results = detect('deep-drilling.jsx');
    const hit = results.find((d) => d.details?.propName === 'theme');
    assert.ok(hit, 'Expected a detection for theme');
    assert.ok(
      hit!.message.includes('theme'),
      'Message should contain the prop name',
    );
  });

  it('19. Returns Detection objects with component name in message', () => {
    const results = detect('deep-drilling.jsx');
    const hit = results.find(
      (d) => d.details?.componentName === 'Wrapper' && d.details?.propName === 'theme',
    );
    assert.ok(hit, 'Expected a detection for Wrapper/theme');
    assert.ok(
      hit!.message.includes('Wrapper'),
      'Message should contain the component name',
    );
  });

  it('20. Returns Detection details with componentName and propName', () => {
    const results = detect('deep-drilling.jsx');
    assert.ok(results.length > 0, 'Need at least one detection to verify');
    for (const d of results) {
      assert.ok(d.details, 'Detection should have details');
      assert.ok(typeof d.details!.componentName === 'string', 'details.componentName should be a string');
      assert.ok(typeof d.details!.propName === 'string', 'details.propName should be a string');
      assert.ok(typeof d.details!.passThroughCount === 'number', 'details.passThroughCount should be a number');
    }
  });
});
