# Workspace & Monorepo Support

## Supported Workspace Types

| Type | Detection Method | Config File |
|---|---|---|
| pnpm | `pnpm-workspace.yaml` | `pnpm-workspace.yaml` |
| npm | `workspaces` field in `package.json` | `package.json` |
| yarn | `workspaces` field in `package.json` | `package.json` |
| Turborepo | `workspaces` in `package.json` + `turbo.json` present | `turbo.json` + `package.json` |
| Nx | `nx.json` with `workspaceLayout` | `nx.json` |
| Lerna | `lerna.json` with optional `packages` array | `lerna.json` |

## How It Works

The scanner follows four steps when it detects a workspace:

1. **Detect** the workspace type by checking config files in priority order.
2. **Discover** all packages by resolving workspace glob patterns (e.g., `packages/*`).
3. **Scan** each package independently, loading its own `.snifferrc.json` if present and auto-detecting its framework from its `package.json`.
4. **Merge** results into a single report, grouped by package and sniffer name.

## Auto-Detection

Workspace detection runs in this order. The first match wins:

1. `--packages` CLI flag (manual override)
2. `pnpm-workspace.yaml`
3. `package.json` `workspaces` field (npm/yarn) -- if `turbo.json` also exists, type is set to `turborepo`
4. `nx.json` -- scans `apps/` and `libs/` directories (or custom dirs from `workspaceLayout`)
5. `lerna.json` -- reads `packages` array, defaults to `packages/*`
6. No match -- treated as a single project

```bash
# Example: pnpm workspace detected automatically
cd my-monorepo/
aps
# Output: "Workspace detected (pnpm, 5 packages)"
```

## CLI Flags

| Flag | Description |
|---|---|
| `-W`, `--workspace` | Force workspace/monorepo mode |
| `--no-workspace` | Force single-project mode (skip workspace detection) |
| `--packages <dirs>` | Comma-separated list of package directories to scan |
| `--package-filter <p>` | Only scan packages matching this pattern |

```bash
# Scan only two specific packages
aps --packages packages/web,packages/api

# Disable workspace mode even if detected
aps --no-workspace

# Filter to packages matching a name
aps --package-filter web
```

## Config Inheritance

Configuration is merged in layers. Each layer overrides the previous one:

```
Built-in defaults
  |  merge
Root .snifferrc.json
  |  merge
Package .snifferrc.json
  |  override
CLI flags
```

For example, the root config might set shared exclude patterns while each package config adds framework-specific sniffers:

```json
// Root .snifferrc.json
{
  "exclude": ["node_modules", "dist", "build", "**/*.test.*"],
  "parallel": true,
  "maxWorkers": 4
}
```

```json
// packages/web/.snifferrc.json
{
  "frameworks": ["react"],
  "include": ["**/*.{jsx,tsx}"],
  "sniffers": {
    "prop-explosion": { "enabled": true, "threshold": 7 }
  }
}
```

```json
// packages/api/.snifferrc.json
{
  "frameworks": ["express"],
  "include": ["**/*.{js,ts}"],
  "sniffers": {
    "god-routes": { "enabled": true, "maxRoutes": 10 }
  }
}
```

The package config inherits `exclude`, `parallel`, and `maxWorkers` from the root. CLI flags like `--format json` override everything.

## Per-Package Framework Detection

Each package's `package.json` is checked independently for framework dependencies. A monorepo can contain packages using different frameworks, and each gets the appropriate sniffers.

```
my-monorepo/
  packages/
    web/          # has "react" in dependencies -> React sniffers
    api/          # has "express" in dependencies -> Express sniffers
    admin/        # has "react" in dependencies -> React sniffers
    auth-service/ # has "@nestjs/core" in dependencies -> NestJS sniffers
```

If a package config does not specify `frameworks` and no frameworks are detected from its `package.json`, the package falls back to the root config's framework setting.

## Setup Wizard in Workspaces

Running `aps init` in a monorepo triggers workspace-aware setup:

1. The wizard detects the workspace type and lists all discovered packages.
2. For each package, it shows the auto-detected framework.
3. You choose between two modes:
   - **Option 1: Root config only** -- a single `.snifferrc.json` at the root covers all packages.
   - **Option 2: Root + per-package configs** -- a shared root config for common settings, plus individual `.snifferrc.json` files in each package with framework-specific sniffers.

```bash
cd my-monorepo/
aps init
# Output:
#   Workspace detected (pnpm, 3 packages)
#
#   web (packages/web) -- React
#   api (packages/api) -- Express
#   auth (packages/auth) -- NestJS
#
#   Generate configs for: (1) Root only, (2) Root + per-package [1]:
```

## Example: Full-Stack Monorepo

Consider a monorepo with a React frontend and an Express backend:

```
fullstack-app/
  pnpm-workspace.yaml
  .snifferrc.json          # shared settings
  packages/
    web/
      .snifferrc.json      # frameworks: ["react"]
      src/
        components/
        hooks/
    api/
      .snifferrc.json      # frameworks: ["express"]
      src/
        routes/
        controllers/
```

Running `aps` produces grouped output:

```bash
aps
```

```
## [web] Prop Explosion (2 issues)
### packages/web/src/components/Dashboard.tsx:23
Component "Dashboard" has 12 props...

## [api] God Routes (1 issue)
### packages/api/src/routes/users.ts:5
File has 15 route handlers...
```

In interactive mode (`aps -i`), results are grouped by `[package] Sniffer Name`. Use the `P` key to filter by package.
