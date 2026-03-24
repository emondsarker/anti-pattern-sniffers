---
description: Research and rank anti-patterns for a framework or technology
---

# Research Patterns

Research anti-patterns for a given framework or technology and recommend which ones to implement as sniffers.

Framework/technology: $ARGUMENTS

## Steps

1. **Check existing implementation**. If a directory `src/sniffers/$ARGUMENTS/` exists in `/home/emon/personal/react-anti-pattern-sniffer`, read its `index.ts` to see which sniffers are already implemented. Note them for later.

2. **Compile anti-patterns**. Using your knowledge of $ARGUMENTS, compile a comprehensive list of common anti-patterns and code smells. For each pattern provide:
   - **Name**: kebab-case identifier (e.g., `callback-hell`, `prop-drilling`)
   - **Description**: one-sentence explanation of the anti-pattern
   - **Regex feasibility**: `high`, `medium`, or `low` — how reliably can this be detected with regex/AST-free static analysis?
   - **False positive risk**: `low`, `medium`, or `high` — how often would detection flag correct code?
   - **Code example**: a short (3-8 line) code snippet showing the anti-pattern

3. **Sort the list** by:
   - Primary: regex feasibility (high first)
   - Secondary: false positive risk (low first)

4. **Present the full ranked table** with columns: Name | Description | Feasibility | FP Risk | Implemented?
   Mark already-implemented patterns with a checkmark.

5. **Deep-dive on top 3 unimplemented recommendations**. For each, provide:
   - **Regex detection strategy**: the pattern(s) to match, what to count, threshold logic
   - **Suggested config**: default thresholds and any options
   - **Trigger example**: code that SHOULD be flagged (bad)
   - **Clean example**: equivalent code that should NOT be flagged (good)
   - **Edge cases**: known limitations or false positive scenarios

6. Output everything as formatted text. Do NOT create any files.
