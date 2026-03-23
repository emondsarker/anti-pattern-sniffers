# react-anti-pattern-sniffer

Zero-dependency CLI tool that detects React anti-patterns in your codebase using regex-based heuristics and parallel worker threads.

## Features

- **Zero runtime dependencies** — uses only Node.js built-ins
- **Three built-in sniffers**: prop explosion, god hook, prop drilling
- **Interactive TUI** — browse results, copy as AI prompt, ignore components
- **Batch mode** — focus on the first N issues at a time
- **Parallel execution** via `worker_threads` for fast analysis
- **Plugin system** — register custom sniffers with security validation
- **Markdown & JSON output** — human-readable reports or structured data
- **`.snifferignore`** — persistently ignore specific components
- **Git hook friendly** — exit codes for CI/CD and husky integration

## Installation

```bash
npm install --save-dev react-anti-pattern-sniffer
```

## Quick Start

```bash
# Scan current directory
npx react-sniff

# Short alias
npx ras

# Interactive mode — browse results in a TUI
ras -i

# Batch mode — show only the first 10 issues
ras -b 10

# Interactive + batch — browse first 20 issues in TUI
ras -i -b 20

# Output JSON report
react-sniff --format json --output report.json
```

## CLI Options

```
Usage: react-sniff [options] [dir]

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

Launch with `ras -i` to get a keyboard-driven TUI for browsing results, organized by code smell:

```
  React Anti-Pattern Sniffer  │  12/42 issues shown  •  85 files scanned

  ▸ ▼ Prop Explosion (6 issues)
      ● src/components/UserProfile.tsx:15 UserProfile — has 10 props
      ● src/components/Dashboard.tsx:42 Dashboard — has 8 props
      ● src/pages/Settings.tsx:23 SettingsForm — has 9 props

    ▶ God Hook (3 issues)

    ▶ Prop Drilling (3 issues)

  [c]opy as prompt  [a]ll as md  [x] ignore  [f]ilter  [d]etails  [q]uit
  ↑/↓ navigate  ←/→ or enter collapse/expand  tab next group
```

### Keyboard Controls

| Key | Action |
|-----|--------|
| `↑`/`↓` or `j`/`k` | Navigate between items |
| `Enter`/`→`/`←` | Expand/collapse smell groups |
| `Tab` | Jump to next group |
| `d` | Toggle details (show suggestion + metadata) |
| `c` | Copy current issue as AI prompt (markdown to clipboard) |
| `a` | Copy all visible issues as markdown |
| `x` | Ignore component (adds to `.snifferignore`) |
| `f` | Cycle filter by smell type |
| `p` | Print current issue markdown (clipboard fallback) |
| `q` | Quit |

## Batch Mode

Use `-b` to limit output to the first N issues. Works in both interactive and non-interactive mode:

```bash
# Show first 5 issues as markdown
ras -b 5

# Browse first 20 issues in TUI
ras -i -b 20

# Only god-hook issues, first 3
ras -b 3 -s god-hook
```

## Sniffers

### Prop Explosion

Detects components with too many props, suggesting decomposition.

```jsx
// ⚠ Flagged: 10 props exceeds threshold of 7
const UserProfile = ({ firstName, lastName, email, phone, avatar, address, role, permissions, isActive, onUpdate }) => { ... }
```

**Fix:** Group related props into objects, use Context, or split the component.

### God Hook

Detects custom hooks with excessive state, effects, or responsibilities.

```jsx
// ⚠ Flagged: 6 useState, 4 useEffect
function useUserDashboard(userId) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  // ...6 more useState, 4 useEffect
}
```

**Fix:** Split into focused sub-hooks (`useUser`, `usePosts`, `useNotifications`).

### Prop Drilling

Detects props that are received but only forwarded to children without local use.

```jsx
// ⚠ Flagged: theme, locale passed through without use
const Wrapper = ({ theme, locale, children }) => (
  <Header theme={theme} locale={locale} />
);
```

**Fix:** Use React Context or component composition.

## `.snifferignore`

Create a `.snifferignore` file in your project root to persistently skip specific components or files. This file is automatically updated when you press `x` in interactive mode.

```gitignore
# Ignore a specific component for a specific sniffer
src/components/UserProfile.tsx:UserProfile  # prop-explosion

# Ignore all issues in a file
src/legacy/OldDashboard.tsx

# Ignore a hook
src/hooks/useMonolith.ts:useMonolith  # god-hook
```

Format: `<file-path>:<ComponentName>  # <sniffer-name>`

- `ComponentName` and `# sniffer-name` are optional
- Lines starting with `#` are comments

## Configuration

Create `.snifferrc.json` in your project root:

```json
{
  "include": ["**/*.{jsx,tsx}"],
  "exclude": ["node_modules", "dist", "build", "**/*.test.*"],
  "parallel": true,
  "maxWorkers": 4,
  "timeoutMs": 30000,
  "outputFormat": "markdown",
  "sniffers": {
    "prop-explosion": {
      "enabled": true,
      "threshold": 7,
      "severity": "warning"
    },
    "god-hook": {
      "enabled": true,
      "maxUseState": 4,
      "maxUseEffect": 3,
      "maxTotalHooks": 10,
      "severity": "warning"
    },
    "prop-drilling": {
      "enabled": true,
      "severity": "warning",
      "whitelistedProps": ["className", "style", "children", "key", "ref", "id"]
    }
  },
  "plugins": []
}
```

## Git Hooks (Husky)

Add to `.husky/pre-commit`:

```bash
npx react-sniff --quiet
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
    // Your detection logic here
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
const { orchestrate } = require('react-anti-pattern-sniffer');

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
