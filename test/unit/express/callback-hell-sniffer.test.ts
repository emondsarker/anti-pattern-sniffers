import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'express', 'callback-hell');

import sniffer from '../../../src/sniffers/express/callback-hell-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — true positives', () => {
  it('detects deep nesting in deep-nesting.js (exceeds default threshold 3)', () => {
    const content = loadFixture('deep-nesting.js');
    const detections = sniffer.detect(content, 'deep-nesting.js', {});
    assert.ok(detections.length > 0, 'should detect deep callback nesting');
  });

  it('returns 2 detections for deep-nesting.js (depth 4 and 5)', () => {
    const content = loadFixture('deep-nesting.js');
    const detections = sniffer.detect(content, 'deep-nesting.js', {});
    assert.equal(detections.length, 2);
    const depths = detections.map(d => (d.details as Record<string, unknown>).depth);
    assert.ok(depths.includes(4), 'should detect nesting at depth 4');
    assert.ok(depths.includes(5), 'should detect nesting at depth 5');
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('deep-nesting.js');
    const detections = sniffer.detect(content, 'deep-nesting.js', {});
    for (const d of detections) {
      assert.ok(d.line >= 1, 'line should be >= 1');
      assert.ok(d.column >= 1, 'column should be >= 1');
    }
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — true negatives', () => {
  it('does NOT flag flat-async.js', () => {
    const content = loadFixture('flat-async.js');
    const detections = sniffer.detect(content, 'flat-async.js', {});
    assert.equal(detections.length, 0);
  });

  it('2 levels of nesting does NOT trigger at default threshold 3', () => {
    const content = [
      'function outer(callback) {',
      '  doSomething((err, data) => {',
      '    doMore(data, (err2, result) => {',
      '      callback(null, result);',
      '    });',
      '  });',
      '}',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', { maxDepth: 3 });
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.js', {});
    assert.deepEqual(detections, []);
  });

  it('handles file with no callbacks', () => {
    const content = 'const x = 1 + 2;\nconsole.log(x);\n';
    const detections = sniffer.detect(content, 'test.js', {});
    assert.deepEqual(detections, []);
  });

  it('does NOT flag react-hooks-false-positives.js fixture', () => {
    const content = loadFixture('react-hooks-false-positives.js');
    const detections = sniffer.detect(content, 'react-hooks-false-positives.js', {});
    assert.equal(detections.length, 0, 'React hook patterns should not be flagged as callback hell');
  });

  it('does NOT flag useEffect with async init and try/catch', () => {
    const content = [
      'useEffect(() => {',
      '  async function init() {',
      '    try {',
      '      const data = await fetch("/api");',
      '      process(data);',
      '    } catch (e) {',
      '      console.error(e);',
      '    }',
      '  }',
      '  init();',
      '}, []);',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', {});
    assert.equal(detections.length, 0, 'useEffect + async + try/catch should not be flagged');
  });

  it('does NOT flag setState with forEach', () => {
    const content = [
      'setItems((prev) => {',
      '  const updated = [...prev];',
      '  ids.forEach((id) => {',
      '    if (!updated.includes(id)) {',
      '      updated.push(id);',
      '    }',
      '  });',
      '  return updated;',
      '});',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', {});
    assert.equal(detections.length, 0, 'State updater + forEach should not be flagged');
  });

  it('does NOT flag useCallback with array method', () => {
    const content = [
      'const handler = useCallback((items) => {',
      '  const found = items.some((item) => {',
      '    return list.find((l) => {',
      '      return l.id === item.id;',
      '    });',
      '  });',
      '  return found;',
      '}, [list]);',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', {});
    assert.equal(detections.length, 0, 'useCallback + array methods should not be flagged');
  });

  it('does NOT flag useEffect cleanup pattern', () => {
    const content = [
      'useEffect(() => {',
      '  const timer = setInterval(tick, 1000);',
      '  return () => {',
      '    clearInterval(timer);',
      '  };',
      '}, [tick]);',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', {});
    assert.equal(detections.length, 0, 'useEffect cleanup should not be flagged');
  });

  it('does NOT flag IIFE inside useEffect', () => {
    const content = [
      'useEffect(() => {',
      '  (function(w, d) {',
      '    function init() {',
      '      const s = d.createElement("script");',
      '      s.async = true;',
      '      d.head.appendChild(s);',
      '    }',
      '    init();',
      '  })(window, document);',
      '}, []);',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', {});
    assert.equal(detections.length, 0, 'IIFE inside useEffect should not be flagged');
  });

  it('does NOT flag single .then() with data processing', () => {
    const content = [
      'spreadsheetRef.current.saveJSON().then((data) => {',
      '  const sheet = data.sheets.find((s) => {',
      '    return s.name === data.activeSheet;',
      '  });',
      '  Object.entries(response).forEach(([key, val]) => {',
      '    process(key, val);',
      '  });',
      '});',
    ].join('\n');
    const detections = sniffer.detect(content, 'test.js', {});
    assert.equal(detections.length, 0, 'Single .then() with array methods should not be flagged');
  });
});

// ---------------------------------------------------------------------------
// React file skipping
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — React file skipping', () => {
  const deepNesting = [
    'const handler = (cb) => {',
    '  doA((err) => {',
    '    doB((err2) => {',
    '      doC((err3) => {',
    '        cb(err3);',
    '      });',
    '    });',
    '  });',
    '};',
  ].join('\n');

  it('skips .tsx files entirely', () => {
    const detections = sniffer.detect(deepNesting, 'Component.tsx', {});
    assert.equal(detections.length, 0, '.tsx files should be skipped');
  });

  it('skips .jsx files entirely', () => {
    const detections = sniffer.detect(deepNesting, 'Component.jsx', {});
    assert.equal(detections.length, 0, '.jsx files should be skipped');
  });

  it('still detects same content in .ts files', () => {
    const detections = sniffer.detect(deepNesting, 'handler.ts', {});
    assert.ok(detections.length > 0, '.ts files should still be analyzed');
  });
});

// ---------------------------------------------------------------------------
// True positives — new fixtures
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — true positives (new patterns)', () => {
  it('detects deeply nested promise chains in promise-chain-nesting.js', () => {
    const content = loadFixture('promise-chain-nesting.js');
    const detections = sniffer.detect(content, 'promise-chain-nesting.js', {});
    assert.ok(detections.length > 0, 'should detect nested .then() chains');
  });

  it('detects deeply nested event emitters in event-emitter-nesting.js', () => {
    const content = loadFixture('event-emitter-nesting.js');
    const detections = sniffer.detect(content, 'event-emitter-nesting.js', {});
    assert.ok(detections.length > 0, 'should detect nested event handler callbacks');
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — configuration', () => {
  it('respects custom maxDepth threshold', () => {
    const content = loadFixture('deep-nesting.js');
    // deep-nesting.js has 5 levels of callback functions.
    // With maxDepth=1, depths 2..5 all exceed threshold
    const detections = sniffer.detect(content, 'deep-nesting.js', { maxDepth: 1 });
    assert.ok(detections.length > 2, 'lower threshold should produce more detections');
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('callback-hell-sniffer — output shape', () => {
  it('returns snifferName "callback-hell"', () => {
    const content = loadFixture('deep-nesting.js');
    const detections = sniffer.detect(content, 'deep-nesting.js', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'callback-hell');
    }
  });

  it('has meta with name "callback-hell"', () => {
    assert.equal(sniffer.meta.name, 'callback-hell');
    assert.equal(sniffer.meta.severity, 'warning');
    assert.equal(sniffer.meta.framework, 'express');
  });
});
