---
description: Validate a plugin file against export schema, security rules, and smoke test requirements
---

Validate the plugin at `$ARGUMENTS`. Follow these steps precisely:

## Step 1: Build the project

```bash
cd /home/emon/personal/react-anti-pattern-sniffer && npx tsc
```

This ensures the plugin validator modules are compiled and available.

## Step 2: Run all three validations

Run export validation, security validation, and smoke test via a single `node -e` command:

```bash
cd /home/emon/personal/react-anti-pattern-sniffer && node -e "
const path = require('path');
const { validatePluginExports, validatePluginSecurity, runPluginSmokeTest } = require('./dist/src/plugins/plugin-validator.js');

const pluginPath = path.resolve('$ARGUMENTS');
console.log('Validating plugin:', pluginPath);
console.log('');

// 1. Export validation
let mod;
try {
  mod = require(pluginPath);
} catch (e) {
  console.log('=== LOAD ERROR ===');
  console.log('FAIL: Could not load plugin module:', e.message);
  process.exit(1);
}

console.log('=== Export Validation (validatePluginExports) ===');
const exportResult = validatePluginExports(mod);
if (exportResult.valid) {
  console.log('PASS: All required exports present with correct types');
  console.log('  - name: \"' + mod.name + '\" (string)');
  console.log('  - description: \"' + mod.description + '\" (string)');
  console.log('  - meta: object with name, description, category, severity, defaultConfig');
  console.log('  - detect: function with ' + mod.detect.length + ' parameter(s)');
} else {
  console.log('FAIL:');
  exportResult.errors.forEach(e => console.log('  - ' + e));
}
console.log('');

// 2. Security validation
console.log('=== Security Validation (validatePluginSecurity) ===');
const securityResult = validatePluginSecurity(pluginPath);
if (securityResult.safe) {
  console.log('PASS: No dangerous patterns detected');
} else {
  console.log('FAIL:');
  securityResult.warnings.forEach(w => console.log('  - ' + w));
}
console.log('');

// 3. Smoke test
console.log('=== Smoke Test (runPluginSmokeTest) ===');
const smokeResult = runPluginSmokeTest(mod);
if (smokeResult.passed) {
  console.log('PASS: detect(\\'\\', \\'test.jsx\\', {}) returned an array');
} else {
  console.log('FAIL:', smokeResult.error);
}
console.log('');

// Summary
const allPassed = exportResult.valid && securityResult.safe && smokeResult.passed;
console.log('=== Summary ===');
console.log('Export Validation: ' + (exportResult.valid ? 'PASS' : 'FAIL'));
console.log('Security Validation: ' + (securityResult.safe ? 'PASS' : 'FAIL'));
console.log('Smoke Test: ' + (smokeResult.passed ? 'PASS' : 'FAIL'));
console.log('');
console.log(allPassed ? 'Plugin is valid and ready to use.' : 'Plugin has issues that need fixing.');
"
```

## Step 3: Report results

Present the results for each validation:

### Export Validation (`validatePluginExports`)
Checks that the plugin module exports:
- `name` (string, non-empty)
- `description` (string)
- `meta` (object) with sub-fields: `name` (string), `description` (string), `category` (string), `severity` (string), `defaultConfig` (object)
- `detect` (function accepting at least 2 parameters: `fileContent`, `filePath`)

### Security Validation (`validatePluginSecurity`)
Scans the plugin source file for dangerous patterns:
- `eval()` -- dangerous code execution
- `new Function()` / `Function()` -- dynamic code creation
- `require('child_process')` -- process spawning
- `require('net')` / `require('http')` / `require('https')` / `require('dgram')` -- network access
- `require('cluster')` -- cluster access
- `process.exit` / `process.kill` -- can kill the host process
- `global.*` / `globalThis.*` assignments -- global pollution

### Smoke Test (`runPluginSmokeTest`)
Calls `detect('', 'test.jsx', {})` and verifies:
- The function does not throw an exception
- The return value is an array

## Step 4: Fix guidance

If any validation fails, explain exactly what needs to be fixed:

- **Missing export**: Add the missing property to `module.exports`. Reference the required interface in `src/sniffers/sniffer-interface.ts` (lines 97-110 for `REQUIRED_EXPORT_SCHEMA` and `REQUIRED_META_SCHEMA`).
- **Wrong type**: Change the export to the correct type as specified in the schema.
- **Security warning**: Remove or replace the flagged pattern. Plugins must not access the network, spawn processes, or execute dynamic code.
- **Smoke test failure**: Ensure `detect()` handles empty input gracefully and always returns an array (even if empty).

Provide the corrected code snippet for each issue found.
