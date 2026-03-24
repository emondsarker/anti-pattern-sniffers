import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename, resolve } from 'node:path';
import type { WorkspaceInfo, WorkspacePackage, WorkspaceType } from '../sniffers/sniffer-interface.js';

/**
 * Read the "name" field from a package.json in the given directory.
 * Falls back to the directory basename if no name is found.
 */
function readPackageName(dir: string): string {
  const pkgPath = join(dir, 'package.json');
  try {
    const raw = readFileSync(pkgPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.name === 'string' && parsed.name.length > 0) {
      return parsed.name;
    }
  } catch {
    // ignore
  }
  return basename(dir);
}

/**
 * Resolve workspace glob patterns (e.g. "packages/*", "apps/**") into
 * concrete WorkspacePackage entries by walking the filesystem.
 */
function resolveWorkspaceGlobs(rootDir: string, patterns: string[]): WorkspacePackage[] {
  const results: WorkspacePackage[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    const segments = pattern.replace(/\/+$/, '').split('/');
    collectDirs(rootDir, segments, 0, rootDir, results, seen);
  }

  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Recursively walk directory tree expanding glob segments.
 */
function collectDirs(
  currentDir: string,
  segments: string[],
  segIndex: number,
  rootDir: string,
  results: WorkspacePackage[],
  seen: Set<string>,
): void {
  if (segIndex >= segments.length) {
    // We've consumed all segments — check if this dir has a package.json
    const absDir = resolve(currentDir);
    if (seen.has(absDir)) return;
    if (existsSync(join(absDir, 'package.json'))) {
      seen.add(absDir);
      results.push({
        name: readPackageName(absDir),
        path: absDir,
        relativePath: relative(rootDir, absDir).replace(/\\/g, '/'),
      });
    }
    return;
  }

  const seg = segments[segIndex];

  if (seg === '**') {
    // ** matches zero or more directory levels
    // Try skipping (zero levels)
    collectDirs(currentDir, segments, segIndex + 1, rootDir, results, seen);
    // Try expanding to each subdir and keep ** active
    let entries: string[];
    try {
      entries = readdirSync(currentDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const full = join(currentDir, entry);
      try {
        if (statSync(full).isDirectory()) {
          collectDirs(full, segments, segIndex, rootDir, results, seen);
        }
      } catch {
        // skip
      }
    }
  } else if (seg === '*') {
    // * matches any single directory name
    let entries: string[];
    try {
      entries = readdirSync(currentDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const full = join(currentDir, entry);
      try {
        if (statSync(full).isDirectory()) {
          collectDirs(full, segments, segIndex + 1, rootDir, results, seen);
        }
      } catch {
        // skip
      }
    }
  } else {
    // Literal segment
    const full = join(currentDir, seg);
    if (existsSync(full)) {
      try {
        if (statSync(full).isDirectory()) {
          collectDirs(full, segments, segIndex + 1, rootDir, results, seen);
        }
      } catch {
        // skip
      }
    }
  }
}

/**
 * Parse a pnpm-workspace.yaml file using a simple line-by-line parser.
 * Returns the list of workspace glob patterns.
 */
function parsePnpmWorkspaceYaml(content: string): string[] {
  const lines = content.split('\n');
  const patterns: string[] = [];
  let inPackages = false;

  for (const line of lines) {
    if (/^packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      // Stop at next top-level key (non-indented, non-empty, not a list item)
      if (/^\S/.test(line) && line.trim().length > 0) {
        break;
      }
      const match = line.match(/^\s*-\s+['"]?(.+?)['"]?\s*$/);
      if (match) {
        patterns.push(match[1]);
      }
    }
  }

  return patterns;
}

/**
 * Build a single-project WorkspaceInfo.
 */
function singleProject(rootDir: string): WorkspaceInfo {
  return {
    isMonorepo: false,
    rootDir,
    packages: [
      {
        name: readPackageName(rootDir),
        path: resolve(rootDir),
        relativePath: '.',
      },
    ],
    type: 'single',
  };
}

/**
 * Discover workspace configuration for a given root directory.
 * Checks multiple workspace types in priority order.
 */
export function discoverWorkspace(
  rootDir: string,
  flags: Record<string, string | boolean> = {},
): WorkspaceInfo {
  const absRoot = resolve(rootDir);

  // 1. Manual packages via --packages flag
  if (typeof flags.packages === 'string' && flags.packages.length > 0) {
    const dirs = flags.packages.split(',').map(d => d.trim()).filter(Boolean);
    const packages: WorkspacePackage[] = [];
    for (const dir of dirs) {
      const absDir = resolve(absRoot, dir);
      if (existsSync(absDir)) {
        packages.push({
          name: readPackageName(absDir),
          path: absDir,
          relativePath: relative(absRoot, absDir).replace(/\\/g, '/'),
        });
      }
    }
    return {
      isMonorepo: packages.length > 1,
      rootDir: absRoot,
      packages,
      type: 'manual',
    };
  }

  // 2. pnpm-workspace.yaml
  const pnpmWorkspacePath = join(absRoot, 'pnpm-workspace.yaml');
  if (existsSync(pnpmWorkspacePath)) {
    const content = readFileSync(pnpmWorkspacePath, 'utf8');
    const patterns = parsePnpmWorkspaceYaml(content);
    const packages = resolveWorkspaceGlobs(absRoot, patterns);
    return {
      isMonorepo: packages.length > 0,
      rootDir: absRoot,
      packages,
      type: 'pnpm',
    };
  }

  // 3. package.json workspaces field (npm / yarn / turborepo)
  const pkgJsonPath = join(absRoot, 'package.json');
  if (existsSync(pkgJsonPath)) {
    try {
      const pkgRaw = readFileSync(pkgJsonPath, 'utf8');
      const pkg = JSON.parse(pkgRaw);

      let workspacePatterns: string[] | undefined;
      if (Array.isArray(pkg.workspaces)) {
        workspacePatterns = pkg.workspaces;
      } else if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
        workspacePatterns = pkg.workspaces.packages;
      }

      if (workspacePatterns && workspacePatterns.length > 0) {
        const packages = resolveWorkspaceGlobs(absRoot, workspacePatterns);

        // Determine type: turborepo takes precedence over npm/yarn
        let type: WorkspaceType = 'npm';
        if (existsSync(join(absRoot, 'turbo.json'))) {
          type = 'turborepo';
        }

        return {
          isMonorepo: packages.length > 0,
          rootDir: absRoot,
          packages,
          type,
        };
      }
    } catch {
      // invalid package.json — continue
    }
  }

  // 4. nx.json
  const nxJsonPath = join(absRoot, 'nx.json');
  if (existsSync(nxJsonPath)) {
    let appsDir = 'apps';
    let libsDir = 'libs';

    try {
      const nxRaw = readFileSync(nxJsonPath, 'utf8');
      const nx = JSON.parse(nxRaw);
      if (nx.workspaceLayout) {
        if (typeof nx.workspaceLayout.appsDir === 'string') appsDir = nx.workspaceLayout.appsDir;
        if (typeof nx.workspaceLayout.libsDir === 'string') libsDir = nx.workspaceLayout.libsDir;
      }
    } catch {
      // use defaults
    }

    const packages: WorkspacePackage[] = [];
    const seen = new Set<string>();
    const scanDirs = [appsDir, libsDir];

    for (const scanDir of scanDirs) {
      const fullScanDir = join(absRoot, scanDir);
      if (!existsSync(fullScanDir)) continue;

      let entries: string[];
      try {
        entries = readdirSync(fullScanDir);
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const entryPath = join(fullScanDir, entry);
        try {
          if (!statSync(entryPath).isDirectory()) continue;
        } catch {
          continue;
        }

        const absEntryPath = resolve(entryPath);
        if (seen.has(absEntryPath)) continue;

        // NX projects can have package.json or project.json
        const hasPkgJson = existsSync(join(entryPath, 'package.json'));
        const hasProjectJson = existsSync(join(entryPath, 'project.json'));

        if (hasPkgJson || hasProjectJson) {
          seen.add(absEntryPath);
          let name: string;
          if (hasPkgJson) {
            name = readPackageName(entryPath);
          } else {
            // Try reading name from project.json
            try {
              const projRaw = readFileSync(join(entryPath, 'project.json'), 'utf8');
              const proj = JSON.parse(projRaw);
              name = typeof proj.name === 'string' ? proj.name : basename(entryPath);
            } catch {
              name = basename(entryPath);
            }
          }

          packages.push({
            name,
            path: absEntryPath,
            relativePath: relative(absRoot, absEntryPath).replace(/\\/g, '/'),
          });
        }
      }
    }

    if (packages.length > 0) {
      return {
        isMonorepo: true,
        rootDir: absRoot,
        packages: packages.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
        type: 'nx',
      };
    }
  }

  // 5. lerna.json
  const lernaJsonPath = join(absRoot, 'lerna.json');
  if (existsSync(lernaJsonPath)) {
    let patterns = ['packages/*'];
    try {
      const lernaRaw = readFileSync(lernaJsonPath, 'utf8');
      const lerna = JSON.parse(lernaRaw);
      if (Array.isArray(lerna.packages) && lerna.packages.length > 0) {
        patterns = lerna.packages;
      }
    } catch {
      // use defaults
    }
    const packages = resolveWorkspaceGlobs(absRoot, patterns);
    return {
      isMonorepo: packages.length > 0,
      rootDir: absRoot,
      packages,
      type: 'lerna',
    };
  }

  // 6. No workspace found — single project
  return singleProject(absRoot);
}
