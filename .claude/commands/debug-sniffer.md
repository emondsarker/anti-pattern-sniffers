---
description: Debug a sniffer's detection logic by running it against a specific file or inline code
---

Debug the sniffer named `$ARGUMENTS` to understand its detection behavior. Follow these steps precisely:

## Step 1: Locate and read the sniffer

Search for the sniffer source file. It will be at one of these locations:
- `src/sniffers/react/$ARGUMENTS-sniffer.ts`
- `src/sniffers/express/$ARGUMENTS-sniffer.ts`
- `src/sniffers/nestjs/$ARGUMENTS-sniffer.ts`
- `src/sniffers/$ARGUMENTS-sniffer.ts`

Read the full source file. Identify:
- The regex patterns or detection logic used
- The thresholds and default config values
- What conditions must be met for a detection to fire

## Step 2: Get test input

Ask the user: "Provide a file path to test against, or paste inline code. If providing a file path, I will read its contents."

If the user provides a file path, read that file. If they provide inline code, use it directly.

## Step 3: Build the project

```bash
cd /home/emon/personal/react-anti-pattern-sniffer && npx tsc
```

## Step 4: Run diagnostic

Determine the framework directory (react, express, nestjs, or root sniffers) where the sniffer lives. Then run the sniffer directly against the input:

```bash
cd /home/emon/personal/react-anti-pattern-sniffer && node -e "
const mod = require('./dist/src/sniffers/<framework>/$ARGUMENTS-sniffer.js');
const sniffer = mod.default || mod;
const code = \`<THE_CODE_CONTENT>\`;
const result = sniffer.detect(code, 'test.tsx', sniffer.meta.defaultConfig);
console.log('Detections found:', result.length);
console.log(JSON.stringify(result, null, 2));
"
```

Replace `<framework>` with the correct subdirectory and `<THE_CODE_CONTENT>` with the actual code (properly escaped).

## Step 5: Analyze results

**If no detections were found:**
- Walk through the sniffer's detection logic step by step
- Explain which conditions were not met (thresholds not exceeded, regex did not match, etc.)
- Show what the code would need to look like to trigger a detection

**If detections were found:**
- Show each detection with its line number, column, message, and severity
- Explain which part of the code triggered each detection
- Confirm whether the detections are true positives or false positives

## Step 6: Suggest config adjustments

Based on the results, suggest `.snifferrc.json` config overrides that would change the detection behavior. For example, lowering thresholds to catch more cases, or raising them to reduce noise. Show the exact config JSON snippet.
