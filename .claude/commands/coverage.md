---
description: Audit test coverage for all sniffers — check tests, fixtures, and describe groups
---

# Test Coverage Audit

Audit the test coverage for every registered sniffer in the project. No arguments required.

## Step 1: Inventory all sniffers

Read each framework's `index.ts` to get the full list of registered sniffers:
- `src/sniffers/react/index.ts`
- `src/sniffers/express/index.ts`
- `src/sniffers/nestjs/index.ts`

Also check for any additional framework directories under `src/sniffers/` that have their own `index.ts`.

Extract every sniffer `name` and its `framework` from the `sniffers` arrays in the `FrameworkDefinition` exports.

## Step 2: Check each sniffer

For each sniffer `<framework>/<name>`, verify:

### Test file exists
Check if `test/unit/<framework>/<name>-sniffer.test.ts` exists. Also check `test/unit/<name>-sniffer.test.ts` for sniffers that may be at the top level.

### Fixture directory exists
Check if `test/fixtures/<framework>/<name>/` exists.

### Fixture files
Check that the fixture directory contains at least 2 files (typically a trigger/bad file and a clean/good file).

### Test describe groups
Read each test file and verify it contains all 4 required describe groups:
1. `true positives` — tests that the sniffer detects the anti-pattern
2. `true negatives` — tests that the sniffer does NOT flag clean code
3. `configuration` — tests for custom config/threshold overrides
4. `output shape` — tests that verify snifferName, line/column, meta fields

### Edge case tests
Check within the test file for:
- Empty file test: a test that passes `''` (empty string) to `sniffer.detect()`
- No-relevant-patterns test: a test with code that has no relation to the pattern being detected

## Step 3: Present summary table

Output a table with one row per sniffer:

```
| Framework | Sniffer               | Test File | Fixtures | 2+ Files | True Pos | True Neg | Config | Output Shape | Empty File | No Pattern |
|-----------|-----------------------|-----------|----------|----------|----------|----------|--------|--------------|------------|------------|
| express   | god-routes            | yes       | yes      | yes      | yes      | yes      | yes    | yes          | yes        | yes        |
| express   | missing-error-handling| yes       | yes      | yes      | yes      | yes      | yes    | yes          | NO         | yes        |
```

Use `yes` for passing checks and `NO` (uppercase) for failing checks to make gaps stand out.

## Step 4: Highlight gaps

After the table, list specific action items for any `NO` entries:
- Missing test file: "Create `test/unit/<framework>/<name>-sniffer.test.ts`"
- Missing fixtures: "Create `test/fixtures/<framework>/<name>/` with trigger and clean files"
- Missing describe group: "Add `<group>` describe block to `test/unit/<framework>/<name>-sniffer.test.ts`"
- Missing edge case: "Add empty file / no-relevant-patterns test to `<test-file>`"
