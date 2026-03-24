---
description: Scaffold a new sniffer with implementation, tests, and fixtures
---

# New Sniffer: $ARGUMENTS

Create a complete new sniffer for this project. The argument format is `<framework>/<sniffer-name>` (e.g., `express/bloated-middleware` or `react/context-explosion`).

## Step 1: Parse arguments

Parse `$ARGUMENTS` into:
- `framework` — the part before the slash (e.g., `express`, `react`, `nestjs`)
- `name` — the part after the slash, kebab-case (e.g., `bloated-middleware`)

If the format is wrong, stop and ask the user for `<framework>/<sniffer-name>`.

## Step 2: Read reference files

Read ALL of these files before writing anything:
1. `src/sniffers/sniffer-interface.ts` — the `SnifferExport`, `SnifferMeta`, `Detection` interfaces
2. `src/sniffers/<framework>/index.ts` — the framework's `FrameworkDefinition` with its sniffers array
3. `src/sniffers/shared/regex-helpers.ts` — shared utilities (`stripCommentsAndStrings`, `getLineNumber`, `getColumnNumber`, `countMatches`, `extractBracedBlock`)
4. `src/sniffers/<framework>/regex-helpers.ts` — framework-specific regex patterns
5. An existing sniffer in the same framework directory (pick any `.ts` file ending in `-sniffer.ts`) to see the exact code style
6. An existing test in `test/unit/<framework>/` to see the test structure
7. An existing fixture directory in `test/fixtures/<framework>/` to see fixture conventions

## Step 3: Gather requirements from user

Ask the user:
- What anti-pattern does this sniffer detect? (description)
- What severity? (`info`, `warning`, or `error`)
- What category? (`props`, `hooks`, `architecture`, `routing`, `validation`, `security`, `dependency-injection`, `custom`)
- What configurable thresholds should it have? (e.g., `maxLines: 50`)
- Show a short code example that SHOULD trigger the sniffer (trigger code)
- Show a short code example that should NOT trigger it (clean code)

## Step 4: Create the sniffer file

Create `src/sniffers/<framework>/<name>-sniffer.ts` using this exact structure:

```typescript
import type { Detection, SnifferExport, Severity } from '../sniffer-interface.js';
import { SOME_PATTERN } from './regex-helpers.js';
import {
  stripCommentsAndStrings,
  getLineNumber,
  getColumnNumber,
  countMatches,
} from '../shared/regex-helpers.js';

const sniffer: SnifferExport = {
  name: '<name>',
  description: '<description>',
  meta: {
    name: '<name>',
    description: '<description>',
    framework: '<framework>',
    category: '<category>',
    severity: '<severity>',
    defaultConfig: {
      // thresholds here
    },
  },

  detect(
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
  ): Detection[] {
    // 1. Parse config with fallbacks to defaults
    // 2. Strip comments: const cleaned = stripCommentsAndStrings(fileContent);
    // 3. Run detection logic
    // 4. Return Detection[] with snifferName, filePath, line, column, message, severity, suggestion, details
  },
};

export default sniffer;
```

Key conventions:
- Import from `'../sniffer-interface.js'` (with `.js` extension)
- Import regex patterns from `'./regex-helpers.js'` and shared utils from `'../shared/regex-helpers.js'`
- `name` in both the top-level and `meta` must match exactly
- Config values should be read with `typeof config.xxx === 'number' ? config.xxx : <default>`
- Severity should be overridable: `const severity: Severity = (config.severity as Severity) || '<default>';`
- Return empty array `[]` when no issues found
- Every detection needs: `snifferName`, `filePath`, `line`, `column`, `message`, `severity`, `suggestion`, `details`

## Step 5: Add regex patterns

If the sniffer needs new regex patterns, add them to `src/sniffers/<framework>/regex-helpers.ts` (or `src/sniffers/shared/regex-helpers.ts` if they are cross-framework). Use `UPPER_SNAKE_CASE` for pattern names and add a JSDoc comment above each.

## Step 6: Register in framework index

Edit `src/sniffers/<framework>/index.ts` and add a new entry to the `sniffers` array:

```typescript
{ name: '<name>', path: join(__dirname, '<name>-sniffer.js') },
```

## Step 7: Create fixture files

Create the fixture directory `test/fixtures/<framework>/<name>/` with:
- A trigger file (e.g., `bad-example.js` or `bad-example.tsx`) containing code that SHOULD be detected
- A clean file (e.g., `clean-example.js` or `clean-example.tsx`) containing code that should NOT be detected

Use realistic code — not minimal stubs.

## Step 8: Create test file

Create `test/unit/<framework>/<name>-sniffer.test.ts` with this exact structure:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', '<framework>', '<name>');

import sniffer from '../../../src/sniffers/<framework>/<name>-sniffer.js';

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// True positives
// ---------------------------------------------------------------------------
describe('<name>-sniffer — true positives', () => {
  // Tests that verify the sniffer DOES detect the anti-pattern
});

// ---------------------------------------------------------------------------
// True negatives
// ---------------------------------------------------------------------------
describe('<name>-sniffer — true negatives', () => {
  // Tests that verify the sniffer does NOT flag clean code
  // MUST include: empty file test, no-relevant-patterns test
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
describe('<name>-sniffer — configuration', () => {
  // Tests for custom thresholds and config overrides
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe('<name>-sniffer — output shape', () => {
  // Tests that verify snifferName, line/column validity, meta fields
});
```

Key conventions:
- `FIXTURES_DIR` uses exactly 4 `..` segments: `join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', ...)`
- Import sniffer from `'../../../src/sniffers/<framework>/<name>-sniffer.js'`
- All 4 describe groups are required
- True negatives MUST include an empty file test and a no-relevant-patterns test
- Use `assert` from `node:assert/strict`

## Step 9: Build

Run `npm run build` and fix any TypeScript errors.

## Step 10: Run the new test

Run `node --test 'dist/test/unit/<framework>/<name>-sniffer.test.js'` and fix any failures.

## Step 11: Run the full suite

Run `npm test` to make sure nothing is broken. Fix any regressions.
