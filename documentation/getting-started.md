# Getting Started

## What is Anti-Pattern Sniffer?

Anti-Pattern Sniffer (`aps`) scans React, Express, and NestJS codebases for common anti-patterns using regex-based heuristics. It has zero runtime dependencies, runs entirely in Node.js, and gives you actionable fixes for every issue it finds.

## Install

```bash
npm install --save-dev anti-pattern-sniffer
```

Requires Node.js 20 or later.

## Your First Scan

Run `npx aps` in your project root. The tool auto-detects your framework from `package.json` and scans accordingly.

```bash
npx aps
```

Example output:

```markdown
# Anti-Pattern Report

## src/components/UserProfile.tsx

### Prop Explosion (warning)
- **Line 12:** Component `UserProfile` accepts 11 props (threshold: 7)
  > Consider grouping related props into an object or using composition.

## src/hooks/useDashboard.ts

### God Hook (warning)
- **Line 1:** Hook `useDashboard` uses 6 useState and 4 useEffect calls
  > Split into smaller, focused hooks like `useDashboardData` and `useDashboardFilters`.

## src/routes/api.ts

### Fat Controller (warning)
- **Line 45:** Route handler has 38 lines of logic (threshold: 20)
  > Extract business logic into a service layer.

Found 3 issues across 3 files.
```

## Setup Wizard

The `init` command walks you through creating a `.snifferrc.json` config file. It auto-detects your frameworks and lets you enable or disable individual sniffers.

```bash
npx aps init
```

The wizard flow:

1. Detects frameworks from your `package.json` (React, Express, NestJS)
2. Asks you to confirm or change the framework selection
3. Shows available sniffers for each framework and lets you disable any
4. Generates and writes `.snifferrc.json` to your project root

## Quick Configuration

Here is a minimal `.snifferrc.json` for a project using React and Express:

```json
{
  "frameworks": ["react", "express"],
  "include": ["**/*.{jsx,tsx}", "**/*.{js,ts}"],
  "exclude": ["node_modules", "dist", "build"]
}
```

All sniffers for the selected frameworks are enabled by default. See [configuration.md](./configuration.md) for the full options reference.

## Interactive Mode

Launch the TUI (terminal user interface) to browse results with keyboard navigation:

```bash
npx aps -i
```

Use arrow keys to move between issues, Enter to expand details, and `q` to quit. You can combine it with `-b` to limit how many issues display at once:

```bash
npx aps -i -b 20
```

## What's Next

- [CLI Reference](./cli-reference.md) -- all flags, subcommands, and examples
- [Configuration](./configuration.md) -- config file format, per-sniffer options, workspace support
- [CI/CD Integration](./ci-cd.md) -- GitHub Actions, Husky hooks, and automation recipes
