---
description: Generate complete documentation for a specific sniffer
---

# Document Sniffer

Generate a full documentation block for a single sniffer.

Sniffer name: $ARGUMENTS

## Steps

1. **Find the sniffer file**. The argument may be a bare name like `god-hook` or a qualified name like `express/callback-hell`. Search for the sniffer source file within `src/sniffers/*/` in `/home/emon/personal/react-anti-pattern-sniffer`:
   - If qualified (contains `/`): look in `src/sniffers/<framework>/<name>.sniffer.ts` or similar.
   - If bare: search all `src/sniffers/*/` directories for a file matching the name.
   If not found, report the error and list available sniffers.

2. **Read the sniffer file** and extract:
   - `name` (kebab-case identifier)
   - `description`
   - `category`
   - `severity`
   - Config interface and `defaultConfig` (thresholds and options)
   - `suggestion` text (the fix recommendation)

3. **Read fixture files** from `test/fixtures/<framework>/<sniffer-name>/`. These typically include bad examples (triggering the pattern) and good examples (clean code). Read all fixture files found.

4. **Output a complete documentation block** in markdown with these sections:
   - `## <Sniffer Name>` heading
   - **Description**: what the anti-pattern is
   - **Why it matters**: why this pattern is problematic (use the suggestion text and your knowledge)
   - **Configuration**: a table with columns: Option | Type | Default | Description
   - **Bad Example**: code block from the bad fixture, with a brief explanation of what triggers detection
   - **Good Example**: code block from the good fixture, showing the correct approach
   - **How to fix**: step-by-step instructions to refactor the anti-pattern

5. Do NOT write to any file. Output the documentation as text so the user can review it first.
