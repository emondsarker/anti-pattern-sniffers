---
description: Run the CLI against real files to manually test sniffer detection
---

# Test Sniffer Against Real Files: $ARGUMENTS

Run the anti-pattern sniffer CLI against actual source files to see what it detects. The argument format is `<path> [flags]` where `<path>` is a file or directory and `[flags]` are optional CLI flags.

## Step 1: Build

Compile the project first:
```bash
tsc
```

Fix any compilation errors before proceeding.

## Step 2: Run the CLI

Execute:
```bash
node bin/sniff.js $ARGUMENTS
```

## Step 3: Present results

Show the output to the user. If the output is large, summarize the key findings.

Suggest additional options the user can try:
- `-f json` — structured JSON output for programmatic use
- `-f markdown` — formatted markdown report
- `-i` — interactive TUI mode for browsing detections with keyboard navigation
- `--framework <name>` — limit to a specific framework's sniffers
- `-o <file>` — write output to a file
