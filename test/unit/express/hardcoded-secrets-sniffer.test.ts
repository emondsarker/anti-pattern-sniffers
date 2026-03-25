import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'express', 'hardcoded-secrets');

import sniffer from '../../../src/sniffers/express/hardcoded-secrets-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('hardcoded-secrets-sniffer — true positives', () => {
  it('detects hardcoded password in with-secrets.js', () => {
    const content = loadFixture('with-secrets.js');
    const detections = sniffer.detect(content, 'with-secrets.js', {});
    const passwordDetection = detections.find(
      d => d.message === 'Hardcoded secret detected' && d.line === 3,
    );
    assert.ok(passwordDetection, 'should detect hardcoded password on line 3');
  });

  it('detects AWS access key in with-secrets.js', () => {
    const content = loadFixture('with-secrets.js');
    const detections = sniffer.detect(content, 'with-secrets.js', {});
    const awsDetection = detections.find(
      d => d.message === 'AWS access key detected',
    );
    assert.ok(awsDetection, 'should detect AWS access key');
    assert.equal(awsDetection.line, 7);
  });

  it('detects connection string with credentials in with-secrets.js', () => {
    const content = loadFixture('with-secrets.js');
    const detections = sniffer.detect(content, 'with-secrets.js', {});
    const connDetection = detections.find(
      d => d.message === 'Connection string with embedded credentials detected',
    );
    assert.ok(connDetection, 'should detect connection string with credentials');
    assert.equal(connDetection.line, 4);
  });

  it('detects API key patterns', () => {
    const content = loadFixture('with-secrets.js');
    const detections = sniffer.detect(content, 'with-secrets.js', {});
    // Line 10: apiKey: 'sk-...'
    const apiKeyDetection = detections.find(d => d.line === 10);
    assert.ok(apiKeyDetection, 'should detect API key on line 10');
    assert.equal(apiKeyDetection.message, 'Hardcoded secret detected');
  });

  it('detects auth_token patterns', () => {
    const content = loadFixture('with-secrets.js');
    const detections = sniffer.detect(content, 'with-secrets.js', {});
    // Line 11: auth_token: '...'
    const tokenDetection = detections.find(d => d.line === 11);
    assert.ok(tokenDetection, 'should detect auth_token on line 11');
    assert.equal(tokenDetection.message, 'Hardcoded secret detected');
  });

  it('multiple secrets in one file = multiple detections', () => {
    const content = loadFixture('with-secrets.js');
    const detections = sniffer.detect(content, 'with-secrets.js', {});
    assert.equal(detections.length, 5);
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('hardcoded-secrets-sniffer — true negatives', () => {
  it('does NOT flag env-vars.js (uses process.env)', () => {
    const content = loadFixture('env-vars.js');
    const detections = sniffer.detect(content, 'env-vars.js', {});
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.js', {});
    assert.deepEqual(detections, []);
  });

  it('does NOT flag file with no relevant patterns', () => {
    const content = 'const x = 1 + 2;\nconsole.log(x);\n';
    const detections = sniffer.detect(content, 'test.js', {});
    assert.deepEqual(detections, []);
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('hardcoded-secrets-sniffer — configuration', () => {
  it('respects custom severity override', () => {
    const content = loadFixture('with-secrets.js');
    const detections = sniffer.detect(content, 'with-secrets.js', { severity: 'info' });
    assert.ok(detections.length > 0);
    for (const d of detections) {
      assert.equal(d.severity, 'info');
    }
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('hardcoded-secrets-sniffer — output shape', () => {
  it('returns snifferName "hardcoded-secrets"', () => {
    const content = loadFixture('with-secrets.js');
    const detections = sniffer.detect(content, 'with-secrets.js', {});
    for (const d of detections) {
      assert.equal(d.snifferName, 'hardcoded-secrets');
    }
  });

  it('returns severity "error" (not "warning")', () => {
    const content = loadFixture('with-secrets.js');
    const detections = sniffer.detect(content, 'with-secrets.js', {});
    for (const d of detections) {
      assert.equal(d.severity, 'error');
    }
  });

  it('has meta with name "hardcoded-secrets" and severity "error"', () => {
    assert.equal(sniffer.meta.name, 'hardcoded-secrets');
    assert.equal(sniffer.meta.severity, 'error');
  });
});
