---
description: Run tests — all, by framework, or by individual sniffer name
---

# Run Tests: $ARGUMENTS

Run tests based on the provided argument. If no argument is given, run the full suite.

## Parse the argument

Determine which category `$ARGUMENTS` falls into:

### Empty or `all`
Run the full test suite:
```bash
npm test
```

### `unit`
Run only unit tests:
```bash
npm run test:unit
```

### `integration`
Run only integration tests:
```bash
npm run test:integration
```

### Framework name (`react`, `express`, `nestjs`, or any other registered framework)
Build and run all tests for that framework:
```bash
tsc && node --test 'dist/test/unit/<framework>/**/*.test.js'
```

### Qualified sniffer name (contains a `/`, e.g., `express/god-routes`)
Parse into `<framework>/<sniffer-name>`, build and run:
```bash
tsc && node --test 'dist/test/unit/<framework>/<sniffer-name>-sniffer.test.js'
```

### Bare sniffer name (no `/`, e.g., `god-routes` or `prop-explosion`)
Search for the matching test file:
1. Check `test/unit/<name>-sniffer.test.ts` (top-level unit tests)
2. Check `test/unit/*/<name>-sniffer.test.ts` (framework subdirectories: react, express, nestjs, etc.)
3. If found, build and run: `tsc && node --test 'dist/<matched-path-with-.js-extension>'`
4. If not found, report that no test file was found for that sniffer name and list available test files.

## After running

Report the test results. If there are failures, show the failing test names and error messages.
