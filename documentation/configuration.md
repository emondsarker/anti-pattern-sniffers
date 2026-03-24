# Configuration

## Config File Locations

The tool searches for config files in your project root in this order:

1. `.snifferrc.json`
2. `.snifferrc.js`
3. `sniffer.config.json`
4. `sniffer.config.js`

The first file found wins. You can also pass an explicit path with `--config`:

```bash
aps --config path/to/my-config.json
```

## Minimal Example

A three-line config that enables only React sniffers:

```json
{
  "frameworks": ["react"]
}
```

Everything else uses sensible defaults. The tool will scan `**/*.{jsx,tsx}` files, skip `node_modules`/`dist`/`build`, and enable all React sniffers.

## Full Example

A `.snifferrc.json` with every option spelled out:

```json
{
  "frameworks": ["react", "express"],
  "include": ["**/*.{jsx,tsx}", "**/*.{js,ts}"],
  "exclude": ["node_modules", "dist", "build", "**/*.test.*", "**/*.spec.*"],
  "parallel": true,
  "maxWorkers": 4,
  "timeoutMs": 30000,
  "outputFormat": "markdown",
  "outputPath": null,
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
      "whitelistedProps": ["className", "style", "children", "key", "ref", "id", "data-testid"]
    },
    "god-routes": { "enabled": true, "severity": "warning" },
    "missing-error-handling": { "enabled": true, "severity": "warning" },
    "fat-controllers": { "enabled": true, "severity": "warning" },
    "no-input-validation": { "enabled": true, "severity": "warning" },
    "callback-hell": { "enabled": true, "severity": "warning" },
    "hardcoded-secrets": { "enabled": true, "severity": "warning" }
  },
  "plugins": []
}
```

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `frameworks` | `string[]` | `["react"]` | Frameworks to scan for: `"react"`, `"express"`, `"nestjs"` |
| `include` | `string[]` | `["**/*.{jsx,tsx}"]` | Glob patterns for files to scan |
| `exclude` | `string[]` | `["node_modules", "dist", "build", "**/*.test.*", "**/*.spec.*"]` | Glob patterns for files/directories to skip |
| `parallel` | `boolean` | `true` | Run sniffers in parallel using worker threads |
| `maxWorkers` | `number` | `4` | Number of worker threads when parallel is enabled |
| `timeoutMs` | `number` | `30000` | Timeout in milliseconds for the entire scan |
| `outputFormat` | `string` | `"markdown"` | Report format: `"markdown"` or `"json"` |
| `outputPath` | `string \| null` | `null` | Write report to this file path; `null` means stdout |
| `sniffers` | `object` | See below | Per-sniffer configuration (enable/disable, thresholds, severity) |
| `plugins` | `array` | `[]` | List of plugin modules to load |

## Per-Sniffer Configuration

Each sniffer can be configured individually inside the `sniffers` object. Every sniffer supports at least `enabled` and `severity`. Some sniffers accept additional threshold options.

**Enable or disable a sniffer:**

```json
{
  "sniffers": {
    "prop-explosion": { "enabled": false }
  }
}
```

**Override a threshold:**

```json
{
  "sniffers": {
    "prop-explosion": {
      "enabled": true,
      "threshold": 10
    }
  }
}
```

This raises the prop count threshold from the default 7 to 10.

**Change severity:**

```json
{
  "sniffers": {
    "god-hook": {
      "severity": "error"
    }
  }
}
```

Supported severity values: `"error"`, `"warning"`, `"info"`.

### Available Sniffer Options

**React sniffers:**

| Sniffer | Option | Type | Default | Description |
|---------|--------|------|---------|-------------|
| `prop-explosion` | `threshold` | `number` | `7` | Max props before flagging |
| `god-hook` | `maxUseState` | `number` | `4` | Max `useState` calls per hook |
| `god-hook` | `maxUseEffect` | `number` | `3` | Max `useEffect` calls per hook |
| `god-hook` | `maxTotalHooks` | `number` | `10` | Max total hook calls per custom hook |
| `prop-drilling` | `whitelistedProps` | `string[]` | `["className", "style", "children", "key", "ref", "id", "data-testid"]` | Props to ignore when detecting drilling |

**Express sniffers:** `god-routes`, `missing-error-handling`, `fat-controllers`, `no-input-validation`, `callback-hell`, `hardcoded-secrets`

**NestJS sniffers:** `god-service`, `missing-dtos`, `business-logic-in-controllers`, `missing-guards`, `magic-strings`

## Config Inheritance (Workspaces)

In workspace/monorepo mode, configuration merges in this order:

```
Built-in Defaults
    |
    v
Root .snifferrc.json
    |
    v
Package .snifferrc.json
    |
    v
CLI Flags (highest priority)
```

Each level overrides the previous. Arrays (like `include`) are replaced, not merged. Objects (like `sniffers`) are deep-merged -- you only need to specify the keys you want to change.

**Root config (`/monorepo/.snifferrc.json`):**

```json
{
  "exclude": ["node_modules", "dist"],
  "parallel": true,
  "maxWorkers": 8
}
```

**Package config (`/monorepo/packages/api/.snifferrc.json`):**

```json
{
  "frameworks": ["express"],
  "include": ["**/*.{js,ts}"],
  "sniffers": {
    "hardcoded-secrets": { "severity": "error" }
  }
}
```

The package inherits `exclude`, `parallel`, and `maxWorkers` from root, sets its own `frameworks` and `include`, and overrides just the severity for `hardcoded-secrets`.

## Framework Auto-Detection

When no `frameworks` value is set in any config file, the tool auto-detects frameworks by checking:

- **package.json dependencies:** looks for `react` / `react-dom` (React), `express` (Express), or `@nestjs/core` (NestJS)
- **Framework config files:** `next.config.js` / `next.config.mjs` / `next.config.ts` (React/Next.js), `nest-cli.json` (NestJS)

Auto-detection runs per package in workspace mode, so a monorepo with a React frontend and an Express API will get the right sniffers for each.
