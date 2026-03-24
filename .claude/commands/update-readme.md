---
description: Regenerate README sections with current sniffer data and CLI options
---

# Update README

Regenerate the dynamic sections of README.md using live source data.

## Steps

1. **Read all framework manifests**. Look for index files in `src/sniffers/*/index.ts` within `/home/emon/personal/react-anti-pattern-sniffer`. At minimum check:
   - `src/sniffers/react/index.ts`
   - `src/sniffers/express/index.ts`
   - `src/sniffers/nestjs/index.ts`
   Also glob for any other `src/sniffers/*/index.ts` files that may exist.

2. **For each sniffer** referenced in the manifests, read its sniffer source file and extract:
   - `name` (the kebab-case identifier)
   - `description` (what it detects)
   - `category`
   - `severity`
   - `defaultConfig` (especially threshold values)

3. **Read the current `README.md`** in the project root.

4. **Read `src/cli/help.ts`** to get the current CLI flags and options.

5. **Update README.md** with the following changes while keeping ALL other content unchanged:
   - Update the total sniffer count wherever it appears.
   - Update or regenerate the framework sniffer tables. Each table should have columns: **Sniffer** | **What it detects** | **Default threshold**.
   - Update the CLI options / usage section to match `help.ts`.

6. Write the updated README.md using the Edit tool, making only the necessary changes.
