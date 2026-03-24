---
description: Analyze a codebase to discover anti-pattern sniffer opportunities and rank them by impact
---

Analyze the codebase at `$ARGUMENTS` to identify opportunities for new anti-pattern sniffers. Follow these steps precisely:

## Step 1: Identify file types and frameworks

List the file types present in the target directory to understand what frameworks and languages are in use. Look for `.tsx`, `.jsx`, `.ts`, `.js`, `.vue`, `.svelte`, and other relevant extensions. Summarize the breakdown.

## Step 2: Read package.json

Read `$ARGUMENTS/package.json` (if it exists) to identify framework dependencies. Look for React, Express, NestJS, Next.js, Vue, Angular, and any other major frameworks or libraries.

## Step 3: Sample source files

Read 5-10 representative source files from the codebase to understand coding patterns, conventions, and common structures. Pick files from different directories to get broad coverage.

## Step 4: Run existing sniffers

Build the project and run the current sniffers against the target path to see what is already being caught:

```bash
cd /home/emon/personal/react-anti-pattern-sniffer && npx tsc && node bin/sniff.js $ARGUMENTS -f json
```

Review the output to understand what the current sniffers already detect.

## Step 5: Suggest new sniffers

Based on the patterns observed in Steps 1-4, suggest new sniffers. For each suggestion, provide:

- **Anti-pattern observed**: What bad pattern was seen in the sampled code
- **Example files**: Which files exhibited this pattern
- **Proposed sniffer name**: Following the `<name>-sniffer` convention
- **Framework**: Which framework category it belongs to (react, express, nestjs, or generic)
- **Detection strategy**: How the sniffer would detect it (regex patterns, AST checks, line counting, etc.)
- **Severity**: info, warning, or error
- **Estimated impact**: How many files are likely affected

## Step 6: Rank by impact

Rank all suggestions by impact score, calculated as: `files_affected x severity_weight` where severity weights are: info=1, warning=2, error=3.

Present the final ranked list as a table with columns: Rank | Sniffer Name | Anti-Pattern | Severity | Files Affected | Impact Score.
