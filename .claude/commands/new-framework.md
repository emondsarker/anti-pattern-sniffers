---
description: Scaffold a new framework with registry integration and init wizard support
---

# New Framework: $ARGUMENTS

Scaffold a complete new framework for this anti-pattern sniffer project. The argument is the framework name in lowercase (e.g., `fastify`, `nextjs`, `angular`).

## Step 1: Read reference files

Read ALL of these before writing anything:
1. `src/sniffers/sniffer-interface.ts` — especially `FrameworkName` union type and `FrameworkDefinition` interface
2. `src/sniffers/react/index.ts` — example framework definition
3. `src/sniffers/express/index.ts` — another example framework definition
4. `src/core/sniffer-registry.ts` — how frameworks are imported and registered in `BUILT_IN_FRAMEWORKS`
5. `src/cli/init-wizard.ts` — `ALL_FRAMEWORKS`, `FRAMEWORK_DESCRIPTIONS`, `SNIFFER_DESCRIPTIONS`, and `detectFrameworks()`

## Step 2: Add to FrameworkName type

Edit `src/sniffers/sniffer-interface.ts` and add `'$ARGUMENTS'` to the `FrameworkName` union type:

```typescript
export type FrameworkName = 'react' | 'express' | 'nestjs' | '$ARGUMENTS' | 'generic';
```

## Step 3: Create framework directory

Create `src/sniffers/$ARGUMENTS/` with two files:

### `src/sniffers/$ARGUMENTS/regex-helpers.ts`

```typescript
/**
 * $ARGUMENTS-specific regex patterns.
 */

// Add patterns here as the framework's sniffers are developed.
```

### `src/sniffers/$ARGUMENTS/index.ts`

```typescript
import { join } from 'node:path';
import type { FrameworkDefinition } from '../sniffer-interface.js';

export const <UPPER_NAME>_FRAMEWORK: FrameworkDefinition = {
  name: '$ARGUMENTS',
  label: '<PascalCaseLabel>',
  defaultInclude: ['**/*.{ts,js}'],  // adjust file extensions for the framework
  sniffers: [
    // Add sniffers here using: { name: '<sniffer-name>', path: join(__dirname, '<sniffer-name>-sniffer.js') }
  ],
};
```

Use `UPPER_SNAKE_CASE` for the export name (e.g., `FASTIFY_FRAMEWORK`, `NEXTJS_FRAMEWORK`).

## Step 4: Register in sniffer-registry.ts

Edit `src/core/sniffer-registry.ts`:
1. Add import at the top: `import { <UPPER_NAME>_FRAMEWORK } from '../sniffers/$ARGUMENTS/index.js';`
2. Add to `BUILT_IN_FRAMEWORKS` array: include the new framework constant alongside the existing ones.

## Step 5: Create fixture directory

Create the empty directory `test/fixtures/$ARGUMENTS/` so that sniffers added later have a place for their fixtures.

## Step 6: Update init wizard

Edit `src/cli/init-wizard.ts`:

1. Add import for the new framework definition at the top of the file
2. Add the framework to `ALL_FRAMEWORKS` array
3. Add entry to `FRAMEWORK_DESCRIPTIONS` record with a short description of what this framework covers
4. Add entries to `SNIFFER_DESCRIPTIONS` for any initial sniffers (if none yet, skip this)
5. Update `detectFrameworks()` function to detect the new framework in `package.json` dependencies

## Step 7: Build and verify

Run:
```bash
npm run build && npm test
```

Fix any TypeScript compilation errors or test failures. The framework should be registered and visible but with an empty sniffers array until sniffers are added via the `/new-sniffer` command.
