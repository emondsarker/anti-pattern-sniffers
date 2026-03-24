# FAQ

## What frameworks are supported?

React, Express, and NestJS. There are 14 built-in sniffers across the three frameworks:

| Framework | Sniffers |
|---|---|
| React | prop-explosion, god-hook, prop-drilling |
| Express | god-routes, missing-error-handling, fat-controllers, no-input-validation, callback-hell, hardcoded-secrets |
| NestJS | god-service, missing-dtos, business-logic-in-controllers, missing-guards, magic-strings |

You can add more frameworks via the plugin system or by contributing to the project.

## Does it work with TypeScript?

Yes. It scans `.ts`, `.tsx`, `.js`, and `.jsx` files. The tool itself is written in TypeScript.

## How is this different from ESLint?

ESLint checks code style and syntax errors at the statement level. `aps` checks for architectural anti-patterns -- things like components with too many props, services with too many dependencies, or route files with too many handlers.

They complement each other. Use ESLint for formatting and syntax, use `aps` for structural code smells.

## Why regex instead of AST?

Zero dependencies. AST parsers like Babel or the TypeScript compiler are large packages with deep dependency trees. Regex-based heuristics are fast, lightweight, and sufficient for the structural patterns this tool detects.

The tradeoff is occasional false positives on unusual code patterns. You can suppress those with `.snifferignore` or by adjusting thresholds in your config.

## How do I ignore false positives?

Three approaches, from most targeted to broadest:

1. **`.snifferignore` file** -- add a line for the specific file, component, and sniffer. Or press `x` in the TUI to auto-generate the entry.
2. **Disable a sniffer** -- set `"enabled": false` in your `.snifferrc.json` for that sniffer.
3. **Raise the threshold** -- increase the threshold value in config so the detection only fires on more extreme cases.

```json
{
  "sniffers": {
    "prop-explosion": { "enabled": true, "threshold": 10 }
  }
}
```

## Can I add my own sniffers?

Yes. Write a `.js` file that exports a `name`, `description`, `meta` object, and a `detect` function. Register it in your `.snifferrc.json` under the `plugins` array.

```json
{
  "plugins": [
    { "path": "./plugins/my-custom-sniffer.js" }
  ]
}
```

See the plugins documentation for the full template and validation rules.

## How do I use it in CI?

The `aps` command exits with code 1 if any issues are found, and code 0 if the codebase is clean. Use `--quiet` to suppress output and rely on the exit code only:

```bash
aps --quiet
```

GitHub Actions example:

```yaml
- name: Check for anti-patterns
  run: npx aps --quiet
```

For JSON output (useful for CI reporting tools):

```bash
aps --format json -o report.json
```

## Can I scan only specific files?

Yes. Pass a directory path as an argument or use the `--dir` flag:

```bash
aps src/components/
aps --dir src/hooks/
```

For finer control, use `include` and `exclude` patterns in `.snifferrc.json`:

```json
{
  "include": ["src/components/**/*.tsx"],
  "exclude": ["node_modules", "dist", "**/*.test.*"]
}
```

You can also run a single sniffer with the `-s` flag:

```bash
aps -s prop-explosion
```

## What does "zero dependencies" mean?

The npm package has no runtime dependencies listed in `dependencies`. It uses only Node.js built-in modules: `fs`, `path`, `worker_threads`, `readline`, and `child_process` (for clipboard in TUI mode). The only dev dependencies are TypeScript and `@types/node` for compilation.

## What is the default batch size?

10 issues. The batch limit controls how many detections are shown in the TUI or in non-interactive output when using the `-b` flag. Change it with:

```bash
aps -b 50        # show up to 50 issues
aps -i -b 20     # TUI with 20 issues
```

## What config file names are recognized?

The tool searches for these files in order:

1. `.snifferrc.json`
2. `.snifferrc.js`
3. `sniffer.config.json`
4. `sniffer.config.js`

You can also specify an explicit path with `--config`:

```bash
aps --config ./my-config.json
```
