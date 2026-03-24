---
description: Add a new regex pattern to a framework or shared regex-helpers file
---

# Add Regex Pattern: $ARGUMENTS

Add a new regex pattern to the project. Arguments format: `<framework> <PATTERN_NAME> <description>`.

Parse `$ARGUMENTS` into:
- `framework` — `shared`, `react`, `express`, `nestjs`, or another framework name
- `PATTERN_NAME` — the constant name in UPPER_SNAKE_CASE (e.g., `ASYNC_HANDLER`)
- `description` — a short human-readable description of what the pattern matches

## Step 1: Determine target file

- If framework is `shared`: target file is `src/sniffers/shared/regex-helpers.ts`
- Otherwise: target file is `src/sniffers/<framework>/regex-helpers.ts`

## Step 2: Read the target file

Read the target regex-helpers file to understand existing patterns and style conventions.

Also read `src/sniffers/shared/regex-helpers.ts` if targeting a framework-specific file, to check the pattern does not already exist in shared helpers.

## Step 3: Gather examples from user

Ask the user:
- What strings should this pattern MATCH? (provide 2-3 examples)
- What strings should this pattern NOT match? (provide 2-3 counter-examples)

## Step 4: Design and add the pattern

Design a regex that matches the provided examples and does not match the counter-examples.

Add it to the target file as an exported constant in `UPPER_SNAKE_CASE` with:
- A JSDoc comment or inline comment explaining what it matches
- The `g` flag if the pattern is intended to be used with `countMatches()` or iterated over with `exec()`

Example style (from `src/sniffers/express/regex-helpers.ts`):

```typescript
// Route handler: (app|router).(get|post|put|patch|delete|use|all)(
export const ROUTE_HANDLER = /(app|router)\.(get|post|put|patch|delete|use|all)\s*\(/g;
```

## Step 5: Build to verify

Run `npm run build` to make sure the pattern compiles without TypeScript errors.

If the user wants, test the pattern quickly by running a short inline script to verify matches.
