# anti-pattern-sniffer

Zero-dependency CLI tool that detects anti-patterns across **React**, **Express**, and **NestJS** codebases using regex-based heuristics and parallel worker threads.

## Features

- **Zero runtime dependencies** — uses only Node.js built-ins
- **14 built-in sniffers** across 3 frameworks (React, Express, NestJS)
- **Setup wizard** — `aps init` to pick frameworks and sniffers
- **Interactive TUI** — browse results, copy as AI prompt, ignore components
- **Framework filter** — focus on one framework at a time in the TUI
- **Batch mode** — focus on the first N issues at a time
- **Parallel execution** via `worker_threads` for fast analysis
- **Plugin system** — register custom sniffers with security validation
- **Markdown & JSON output** — human-readable reports or structured data
- **`.snifferignore`** — persistently ignore specific files or components
- **Git hook friendly** — exit codes for CI/CD and husky integration

## Installation

```bash
npm install --save-dev anti-pattern-sniffer
```

## Quick Start

```bash
# Interactive setup — pick your frameworks and sniffers
aps init

# Scan current directory
aps

# Interactive mode — browse results in a TUI
aps -i

# Batch mode — show only the first 10 issues
aps -b 10

# Interactive + batch — browse first 20 issues in TUI
aps -i -b 20

# Output JSON report
aps --format json --output report.json

# Run only Express sniffers
aps -s express/god-routes,express/fat-controllers
```

## CLI Options

```
Usage: aps [options] [dir]

Commands:
  aps init                 Interactive setup wizard

Options:
  -d, --dir <path>         Target directory (default: cwd)
  -c, --config <path>      Config file path (default: .snifferrc.json)
  -s, --sniffers <list>    Comma-separated sniffers to run
  -f, --format <type>      Output format: markdown | json
  -o, --output <path>      Write report to file
  -w, --workers <n>        Worker thread count (default: 4)
  -i, --interactive        Launch interactive TUI to browse results
  -b, --batch <n>          Limit output to the first N issues (default: 10)
      --parallel           Enable parallel execution (default)
      --no-parallel        Run sequentially
      --verbose            Debug output
  -q, --quiet              Exit code only, no output
  -h, --help               Show help
  -v, --version            Show version
```

## Interactive Mode

Launch with `aps -i` to get a keyboard-driven TUI for browsing results:

```
  Anti-Pattern Sniffer  │  12/42 issues shown  •  85 files scanned

  ▸ ▼ React > Prop Explosion (6 issues)
      ● src/components/UserProfile.tsx:15 UserProfile — has 10 props
      ● src/components/Dashboard.tsx:42 Dashboard — has 8 props

    ▶ Express > God Routes (3 issues)

    ▶ NestJS > God Service (3 issues)

  [c]opy as prompt  [a]ll as md  [x] ignore  [f]ilter  [F]ramework  [d]etails  [q]uit
  ↑/↓ navigate  ←/→ or enter collapse/expand  tab next group
```

### Keyboard Controls

| Key | Action |
|-----|--------|
| `↑`/`↓` or `j`/`k` | Navigate between items |
| `Enter`/`→`/`←` | Expand/collapse smell groups |
| `Tab` | Jump to next group |
| `d` | Toggle details (show suggestion + metadata) |
| `c` | Copy current issue as AI prompt (markdown) |
| `a` | Copy all visible issues as markdown |
| `x` | Ignore component (adds to `.snifferignore`) |
| `f` | Cycle filter by smell type |
| `F` | Cycle filter by framework (React/Express/NestJS) |
| `p` | Print current issue markdown (clipboard fallback) |
| `q` | Quit |

## Sniffers

### React (3 sniffers)

| Sniffer | What it detects | Default threshold |
|---------|----------------|-------------------|
| `react/prop-explosion` | Components with too many props | 7 props |
| `react/god-hook` | Custom hooks with excessive state/effects | 4 useState, 3 useEffect |
| `react/prop-drilling` | Props forwarded without local use | any forwarded prop |

### Express (6 sniffers)

| Sniffer | What it detects | Default threshold |
|---------|----------------|-------------------|
| `express/god-routes` | Route files with too many handlers | 10 routes |
| `express/missing-error-handling` | Async handlers without try-catch or error middleware | any unhandled async |
| `express/fat-controllers` | Route handlers with too much logic | 50 lines or 3+ awaits |
| `express/no-input-validation` | `req.body`/`req.params` used without validation | any unvalidated access |
| `express/callback-hell` | Deeply nested callbacks | 3 levels deep |
| `express/hardcoded-secrets` | Passwords, API keys, connection strings in code | any match |

### NestJS (5 sniffers)

| Sniffer | What it detects | Default threshold |
|---------|----------------|-------------------|
| `nestjs/god-service` | Services with too many dependencies/methods | 8 deps or 15 methods |
| `nestjs/missing-dtos` | `@Body()` params typed as `any` or missing DTOs | any untyped param |
| `nestjs/business-logic-in-controllers` | Controllers with inline business logic | 50 lines or logic keywords |
| `nestjs/missing-guards` | Sensitive routes without `@UseGuards` | admin/auth routes |
| `nestjs/magic-strings` | Repeated string literals in conditionals | 3+ occurrences |

## Setup Wizard

Run `aps init` to interactively configure your project:

```
$ aps init

  Anti-Pattern Sniffer — Setup

  Which frameworks does your project use?
  ▸ [x] React
    [x] Express
    [ ] NestJS

  Which React sniffers do you want to enable?
  ▸ [x] prop-explosion
    [x] god-hook
    [x] prop-drilling

  ✔ Created .snifferrc.json
```

This generates a `.snifferrc.json` with the right `include` patterns and enabled sniffers for your stack.

## Configuration

Create `.snifferrc.json` in your project root (or use `aps init`):

```json
{
  "frameworks": ["react", "express"],
  "include": ["**/*.{jsx,tsx,js,ts}"],
  "exclude": ["node_modules", "dist", "build", "**/*.test.*"],
  "parallel": true,
  "maxWorkers": 4,
  "timeoutMs": 30000,
  "outputFormat": "markdown",
  "sniffers": {
    "react/prop-explosion": {
      "enabled": true,
      "threshold": 7,
      "severity": "warning"
    },
    "react/god-hook": {
      "enabled": true,
      "maxUseState": 4,
      "maxUseEffect": 3,
      "maxTotalHooks": 10,
      "severity": "warning"
    },
    "express/god-routes": {
      "enabled": true,
      "maxRoutes": 10,
      "severity": "warning"
    },
    "express/hardcoded-secrets": {
      "enabled": true,
      "severity": "error"
    }
  },
  "plugins": []
}
```

## `.snifferignore`

Create a `.snifferignore` file to persistently skip specific files or components. Updated automatically when you press `x` in interactive mode.

```gitignore
# Ignore a specific component for a specific sniffer
src/components/UserProfile.tsx:UserProfile  # prop-explosion

# Ignore all issues in a file
src/legacy/OldDashboard.tsx

# Ignore a hook
src/hooks/useMonolith.ts:useMonolith  # god-hook
```

## Git Hooks (Husky)

Add to `.husky/pre-commit`:

```bash
npx aps --quiet
```

Exit codes:
- `0` — no issues found
- `1` — anti-patterns detected
- `2` — configuration or runtime error

## Custom Plugins

Create a sniffer module:

```js
// my-sniffer.js
module.exports = {
  name: 'no-inline-styles',
  description: 'Detects inline style objects in JSX',
  meta: {
    name: 'no-inline-styles',
    description: 'Flags inline style={{}} usage',
    category: 'custom',
    severity: 'info',
    defaultConfig: {},
  },
  detect(fileContent, filePath, config) {
    const detections = [];
    // Return array of Detection objects:
    // { snifferName, filePath, line, column, message, severity, suggestion }
    return detections;
  },
};
```

Register in `.snifferrc.json`:

```json
{
  "plugins": [
    { "path": "./my-sniffer.js" }
  ]
}
```

### Plugin Security

Plugins are validated before execution:
1. **Schema check** — must export `name`, `description`, `meta`, `detect`
2. **Security scan** — warns on `eval()`, `Function()`, `child_process`, etc.
3. **Smoke test** — must return an array on empty input
4. **Worker isolation** — runs in separate V8 isolate with memory limits
5. **Timeout** — killed after `timeoutMs` (default 30s)

## Programmatic API

```js
const { orchestrate } = require('anti-pattern-sniffer');

const result = await orchestrate(config, targetDir);
console.log(result.output);      // formatted report
console.log(result.issueCount);  // number of issues
console.log(result.fileCount);   // files scanned
console.log(result.grouped);     // Map<string, SnifferResult[]>
```

## Requirements

- Node.js >= 20.0.0

## License

MIT
