---
description: Validate that all sniffers follow correct structural patterns, naming conventions, registration, and best practices
---

Lint all sniffers in the project for correctness and consistency. No arguments required.

## Step 1: Build to catch type errors

```bash
cd /home/emon/personal/react-anti-pattern-sniffer && npx tsc
```

Report any TypeScript compilation errors. If the build fails, list all errors before continuing with the structural checks.

## Step 2: Discover all sniffers

Read each framework's index file to get the registered sniffer list:
- `src/sniffers/react/index.ts`
- `src/sniffers/express/index.ts`
- `src/sniffers/nestjs/index.ts`

Also check for root-level sniffers in `src/sniffers/` (files matching `*-sniffer.ts`).

## Step 3: Validate each sniffer

For each sniffer found, read its source file and check all of the following:

### Structure checks
- Imports `SnifferExport` from `../sniffer-interface` (or appropriate relative path)
- Has a `default export` (either `export default` or `module.exports`)
- Has a `detect` function that accepts `(fileContent: string, filePath: string, config: Record<string, unknown>)`
- Has a `meta` object conforming to `SnifferMeta` interface (name, description, category, severity, defaultConfig)

### Naming checks
- The `name` property matches the filename (e.g., `prop-explosion-sniffer.ts` should have `name: 'prop-explosion'`)
- `meta.name` matches the top-level `name`
- `snifferName` values used in Detection objects pushed to the results array match the sniffer's `name`

### Registration checks
- The sniffer is listed in its framework's `index.ts` file
- The path in `index.ts` uses `.js` extension (for compiled output)

### Test checks
- A test file exists at `test/unit/<framework>/<name>-sniffer.test.ts` or `test/unit/<name>-sniffer.test.ts`
- A fixture directory exists at `test/fixtures/<framework>/<name>/` or `test/fixtures/<name>/`
- The fixture directory contains at least 2 fixture files
- The test file contains at least 4 `describe` blocks

### Best practice checks
- Uses `stripCommentsAndStrings()` utility to avoid false positives in comments/strings
- When using global regex (`/g` flag), creates a new RegExp instance or resets `lastIndex` to avoid stale state
- Has a `resolveConfig()` helper function that merges default config with user config

## Step 4: Present results

For each sniffer, present a checklist:

```
## <sniffer-name> (src/sniffers/<framework>/<name>-sniffer.ts)

- [x] Structure: default export with detect + meta
- [x] Naming: name matches filename
- [ ] Registration: NOT listed in index.ts  <-- VIOLATION
- [x] Tests: test file exists with 4 describe blocks
- [ ] Best practices: missing stripCommentsAndStrings()  <-- VIOLATION
```

At the end, provide a summary: total sniffers checked, total passing all checks, total with violations. List all specific violations with their file paths and what needs to be fixed.
