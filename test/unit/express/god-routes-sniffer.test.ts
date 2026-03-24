import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'express', 'god-routes');

import sniffer from '../../../src/sniffers/express/god-routes-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('god-routes-sniffer — true positives', () => {
  it('detects 15 routes in many-routes.js (above default threshold 10)', () => {
    const content = loadFixture('many-routes.js');
    const detections = sniffer.detect(content, 'many-routes.js', {});
    assert.equal(detections.length, 1);
    assert.ok(detections[0].message.includes('15 route handlers'));
    assert.ok(detections[0].message.includes('threshold: 10'));
  });

  it('returns correct routeCount and maxRoutes in details', () => {
    const content = loadFixture('many-routes.js');
    const detections = sniffer.detect(content, 'many-routes.js', {});
    const details = detections[0].details as Record<string, unknown>;
    assert.equal(details.routeCount, 15);
    assert.equal(details.maxRoutes, 10);
  });

  it('counts router.get and app.get equally', () => {
    const content = [
      "const app = require('express')();",
      "app.get('/a', (req, res) => { res.send('a'); });",
      "app.post('/b', (req, res) => { res.send('b'); });",
      "const router = require('express').Router();",
      "router.get('/c', (req, res) => { res.send('c'); });",
      "router.post('/d', (req, res) => { res.send('d'); });",
    ].join('\n');
    // 4 routes, threshold 3 → flagged
    const detections = sniffer.detect(content, 'test.js', { maxRoutes: 3 });
    assert.equal(detections.length, 1);
    const details = detections[0].details as Record<string, unknown>;
    assert.equal(details.routeCount, 4);
  });

  it('multiple detections if called for multiple files', () => {
    const content = loadFixture('many-routes.js');
    const d1 = sniffer.detect(content, 'file-a.js', {});
    const d2 = sniffer.detect(content, 'file-b.js', {});
    assert.equal(d1.length, 1);
    assert.equal(d2.length, 1);
    assert.equal(d1[0].filePath, 'file-a.js');
    assert.equal(d2[0].filePath, 'file-b.js');
  });
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('god-routes-sniffer — true negatives', () => {
  it('does NOT flag few-routes.js (3 routes, below threshold 10)', () => {
    const content = loadFixture('few-routes.js');
    const detections = sniffer.detect(content, 'few-routes.js', {});
    assert.equal(detections.length, 0);
  });

  it('does NOT flag file at exactly the threshold', () => {
    const content = loadFixture('many-routes.js');
    // 15 routes, threshold 15 → not flagged (uses <=)
    const detections = sniffer.detect(content, 'many-routes.js', { maxRoutes: 15 });
    assert.equal(detections.length, 0);
  });

  it('does NOT flag file with no routes', () => {
    const content = 'const x = 1 + 2;\nconsole.log(x);\n';
    const detections = sniffer.detect(content, 'test.js', {});
    assert.equal(detections.length, 0);
  });

  it('handles empty file', () => {
    const detections = sniffer.detect('', 'empty.js', {});
    assert.deepEqual(detections, []);
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('god-routes-sniffer — configuration', () => {
  it('respects custom maxRoutes threshold', () => {
    const content = loadFixture('few-routes.js');
    // few-routes has 3 routes; threshold 2 → flagged
    const detections = sniffer.detect(content, 'few-routes.js', { maxRoutes: 2 });
    assert.equal(detections.length, 1);
    const details = detections[0].details as Record<string, unknown>;
    assert.equal(details.routeCount, 3);
    assert.equal(details.maxRoutes, 2);
  });

  it('counts app.use() as a route', () => {
    // ROUTE_HANDLER regex includes 'use' in its pattern
    const content = [
      "const app = require('express')();",
      "app.use(cors());",
      "app.use(bodyParser.json());",
      "app.get('/a', (req, res) => { res.send('a'); });",
    ].join('\n');
    // 3 matches (2 use + 1 get), threshold 2 → flagged
    const detections = sniffer.detect(content, 'test.js', { maxRoutes: 2 });
    assert.equal(detections.length, 1);
    const details = detections[0].details as Record<string, unknown>;
    assert.equal(details.routeCount, 3);
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('god-routes-sniffer — output shape', () => {
  it('returns snifferName "god-routes"', () => {
    const content = loadFixture('many-routes.js');
    const detections = sniffer.detect(content, 'many-routes.js', {});
    assert.equal(detections[0].snifferName, 'god-routes');
  });

  it('returns valid line numbers', () => {
    const content = loadFixture('many-routes.js');
    const detections = sniffer.detect(content, 'many-routes.js', {});
    assert.equal(detections.length, 1);
    assert.ok(detections[0].line >= 1, 'line should be >= 1');
    assert.ok(detections[0].column >= 1, 'column should be >= 1');
  });

  it('has meta with name "god-routes"', () => {
    assert.equal(sniffer.meta.name, 'god-routes');
    assert.equal(sniffer.meta.severity, 'warning');
    assert.equal(sniffer.meta.framework, 'express');
  });
});
