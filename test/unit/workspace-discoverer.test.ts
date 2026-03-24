import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { discoverWorkspace } from '../../src/core/workspace-discoverer.js';

const FIXTURES = join(__dirname, '..', '..', '..', 'test', 'fixtures');

// ---------------------------------------------------------------------------
// npm workspaces
// ---------------------------------------------------------------------------
describe('workspace-discoverer — npm workspaces', () => {
  const root = join(FIXTURES, 'workspace-npm');

  it('detects npm workspace type', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.type, 'npm');
  });

  it('isMonorepo is true', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.isMonorepo, true);
  });

  it('discovers 2 packages', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.packages.length, 2);
  });

  it('reads package names from package.json', () => {
    const info = discoverWorkspace(root, {});
    const names = info.packages.map(p => p.name).sort();
    assert.deepEqual(names, ['@test/api', '@test/ui']);
  });

  it('has correct relative paths', () => {
    const info = discoverWorkspace(root, {});
    const relPaths = info.packages.map(p => p.relativePath).sort();
    assert.deepEqual(relPaths, ['packages/api', 'packages/ui']);
  });
});

// ---------------------------------------------------------------------------
// pnpm workspaces
// ---------------------------------------------------------------------------
describe('workspace-discoverer — pnpm workspaces', () => {
  const root = join(FIXTURES, 'workspace-pnpm');

  it('detects pnpm workspace type', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.type, 'pnpm');
  });

  it('isMonorepo is true', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.isMonorepo, true);
  });

  it('discovers 3 packages (2 apps + 1 lib)', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.packages.length, 3);
  });

  it('reads package names correctly', () => {
    const info = discoverWorkspace(root, {});
    const names = info.packages.map(p => p.name).sort();
    assert.deepEqual(names, ['@test/server', '@test/shared', '@test/web']);
  });
});

// ---------------------------------------------------------------------------
// nx workspaces
// ---------------------------------------------------------------------------
describe('workspace-discoverer — nx workspaces', () => {
  const root = join(FIXTURES, 'workspace-nx');

  it('detects nx workspace type', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.type, 'nx');
  });

  it('isMonorepo is true', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.isMonorepo, true);
  });

  it('discovers 3 packages', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.packages.length, 3);
  });

  it('reads package names correctly', () => {
    const info = discoverWorkspace(root, {});
    const names = info.packages.map(p => p.name).sort();
    assert.deepEqual(names, ['backend', 'frontend', 'utils']);
  });

  it('has correct relative paths', () => {
    const info = discoverWorkspace(root, {});
    const relPaths = info.packages.map(p => p.relativePath).sort();
    assert.deepEqual(relPaths, ['apps/backend', 'apps/frontend', 'libs/utils']);
  });
});

// ---------------------------------------------------------------------------
// single project (non-workspace)
// ---------------------------------------------------------------------------
describe('workspace-discoverer — single project', () => {
  const root = join(FIXTURES, 'prop-explosion');

  it('isMonorepo is false', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.isMonorepo, false);
  });

  it('type is single', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.type, 'single');
  });

  it('returns 1 package', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.packages.length, 1);
  });

  it('relative path is "."', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.packages[0].relativePath, '.');
  });
});

// ---------------------------------------------------------------------------
// manual packages via flags
// ---------------------------------------------------------------------------
describe('workspace-discoverer — manual packages', () => {
  const root = join(FIXTURES, 'workspace-npm');

  it('uses manual type when packages flag is set', () => {
    const info = discoverWorkspace(root, { packages: 'packages/ui,packages/api' });
    assert.equal(info.type, 'manual');
  });

  it('discovers specified packages', () => {
    const info = discoverWorkspace(root, { packages: 'packages/ui,packages/api' });
    assert.equal(info.packages.length, 2);
  });

  it('reads correct package names', () => {
    const info = discoverWorkspace(root, { packages: 'packages/ui,packages/api' });
    const names = info.packages.map(p => p.name).sort();
    assert.deepEqual(names, ['@test/api', '@test/ui']);
  });

  it('isMonorepo is true when multiple packages', () => {
    const info = discoverWorkspace(root, { packages: 'packages/ui,packages/api' });
    assert.equal(info.isMonorepo, true);
  });

  it('isMonorepo is false when single package', () => {
    const info = discoverWorkspace(root, { packages: 'packages/ui' });
    assert.equal(info.isMonorepo, false);
  });
});

// ---------------------------------------------------------------------------
// turborepo detection
// ---------------------------------------------------------------------------
describe('workspace-discoverer — turborepo', () => {
  const root = join(FIXTURES, 'workspace-turbo');

  it('detects turborepo type when turbo.json exists', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.type, 'turborepo');
  });

  it('isMonorepo is true', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.isMonorepo, true);
  });

  it('discovers 2 packages', () => {
    const info = discoverWorkspace(root, {});
    assert.equal(info.packages.length, 2);
  });

  it('reads correct turborepo package names', () => {
    const info = discoverWorkspace(root, {});
    const names = info.packages.map(p => p.name).sort();
    assert.deepEqual(names, ['@turbo/api', '@turbo/ui']);
  });
});

// ---------------------------------------------------------------------------
// rootDir is always absolute
// ---------------------------------------------------------------------------
describe('workspace-discoverer — rootDir', () => {
  it('rootDir is always an absolute path', () => {
    const info = discoverWorkspace(join(FIXTURES, 'workspace-npm'), {});
    assert.equal(info.rootDir, resolve(join(FIXTURES, 'workspace-npm')));
  });
});
