---
description: Scaffold a new external plugin with proper structure, validation, and security compliance
---

Create a new external plugin named `$ARGUMENTS`. Follow these steps precisely:

## Step 1: Understand the plugin interface

Read these files to understand the required plugin structure:
- `src/sniffers/sniffer-interface.ts` -- for `SnifferExport`, `REQUIRED_EXPORT_SCHEMA`, `REQUIRED_META_SCHEMA`
- `src/plugins/plugin-validator.ts` -- for validation rules (exports, security, smoke test)
- `test/fixtures/plugins/valid-plugin.js` -- for the reference plugin implementation

Key requirements from the interface:
- **REQUIRED_EXPORT_SCHEMA**: must export `name` (string), `description` (string), `meta` (object), `detect` (function)
- **REQUIRED_META_SCHEMA**: meta must have `name` (string), `description` (string), `category` (string), `severity` (string), `defaultConfig` (object)
- `detect` function must accept at least 2 parameters `(fileContent, filePath)` and return an array of Detection objects

## Step 2: Gather plugin details

Ask the user the following questions:
1. What does this plugin detect? (Description of the anti-pattern)
2. What severity should it have? (`info`, `warning`, or `error`)
3. What configuration thresholds does it need? (e.g., `maxAllowed: 3`)
4. Where should the plugin file be created? (Default: `./plugins/$ARGUMENTS-plugin.js`)

## Step 3: Create the plugin file

Create a CommonJS `.js` file (NOT TypeScript) following the `valid-plugin.js` pattern exactly. The file must use `module.exports = { ... }` syntax.

```js
module.exports = {
  name: '$ARGUMENTS',
  description: '<user-provided description>',
  meta: {
    name: '$ARGUMENTS',
    description: '<user-provided description>',
    category: 'custom',
    severity: '<user-chosen severity>',
    defaultConfig: { <user-chosen thresholds> },
  },
  detect(fileContent, filePath, config) {
    const detections = [];
    // Detection logic here using regex patterns
    // For each match found:
    // 1. Calculate the line number from match.index
    // 2. Push a detection object with: snifferName, filePath, line, column, message, severity, suggestion
    return detections;
  },
};
```

## Step 4: Security compliance

The plugin must NOT contain any of the following:
- `eval()` or `new Function()`
- `require('child_process')`, `require('net')`, `require('http')`, `require('https')`, `require('dgram')`, `require('cluster')`
- `process.exit` or `process.kill`
- `global.<anything> =` or `globalThis.<anything> =` assignments

Verify the generated code does not include any of these patterns.

## Step 5: Detection object format

Each detection pushed to the array must have this shape:
```js
{
  snifferName: '$ARGUMENTS',
  filePath: filePath,
  line: <number>,
  column: 1,
  message: '<what was detected>',
  severity: config.severity || '<default severity>',
  suggestion: '<how to fix it>',
}
```

The line number calculation pattern (from valid-plugin.js):
```js
let line = 1;
for (let i = 0; i < match.index; i++) {
  if (fileContent[i] === '\n') line++;
}
```

## Step 6: Configuration instructions

Tell the user to register the plugin in their `.snifferrc.json` by adding it to the `plugins` array:

```json
{
  "plugins": [
    {
      "path": "./plugins/$ARGUMENTS-plugin.js",
      "config": {}
    }
  ]
}
```

The `config` object can override any keys from `defaultConfig`.

## Step 7: Validate the plugin

After creating the file, build and run validation:

```bash
cd /home/emon/personal/react-anti-pattern-sniffer && npx tsc && node -e "
const { validatePluginExports, validatePluginSecurity, runPluginSmokeTest } = require('./dist/src/plugins/plugin-validator.js');
const pluginPath = require('path').resolve('<plugin-file-path>');
const mod = require(pluginPath);

console.log('=== Export Validation ===');
const ev = validatePluginExports(mod);
console.log(ev.valid ? 'PASS' : 'FAIL', ev.errors);

console.log('=== Security Validation ===');
const sv = validatePluginSecurity(pluginPath);
console.log(sv.safe ? 'PASS' : 'FAIL', sv.warnings);

console.log('=== Smoke Test ===');
const st = runPluginSmokeTest(mod);
console.log(st.passed ? 'PASS' : 'FAIL', st.error);
"
```

Report the results. If any validation fails, fix the plugin file and re-run.
