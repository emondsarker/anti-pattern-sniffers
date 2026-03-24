---
description: Compile the project with TypeScript and optionally run npm link
---

# Build

Compile the project and optionally make CLI commands available globally.

## Steps

1. Run `npm run build` (which runs `tsc`) in the project root `/home/emon/personal/react-anti-pattern-sniffer`.
2. If the build fails, report every TypeScript error with its file path and line number in a clear list. STOP here on failure.
3. If the build succeeds, report success and the number of files compiled.
4. If $ARGUMENTS contains "link", run `npm link` to register the `sniff`, `aps`, and `ras` CLI commands globally. Report whether the link succeeded and which commands are now available.
