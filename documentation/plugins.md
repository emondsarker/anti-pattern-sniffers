# Custom Plugins

## What is a Plugin?

A plugin is a custom sniffer that you write and keep in your project. It follows the same interface as the built-in sniffers (a `detect` function that returns an array of detections) but lives outside the `aps` npm package. Plugins let you enforce project-specific rules without forking the tool.

## Quick Start

Three steps to create and run a plugin:

1. Create a `.js` file with the plugin code.
2. Register the plugin in your `.snifferrc.json`.
3. Run `aps` as usual.

## Plugin Template

Here is a complete working plugin that flags `console.log` statements:

```js
// plugins/no-console-log.js
module.exports = {
  name: 'no-console-log',
  description: 'Flags console.log statements left in production code',
  meta: {
    name: 'no-console-log',
    description: 'Flags console.log statements left in production code',
    category: 'custom',
    severity: 'warning',
    defaultConfig: {
      enabled: true,
      severity: 'warning',
    },
  },
  detect(fileContent, filePath, config) {
    const detections = [];
    const lines = fileContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/console\.log\s*\(/);
      if (match) {
        detections.push({
          snifferName: 'no-console-log',
          filePath: filePath,
          line: i + 1,
          column: match.index + 1,
          message: 'console.log found. Remove before shipping to production.',
          severity: config.severity || 'warning',
          suggestion: 'Use a proper logger (e.g., winston, pino) or remove the statement.',
          details: {
            lineContent: lines[i].trim(),
          },
        });
      }
    }

    return detections;
  },
};
```

## Detection Object

Each item returned by `detect()` must follow this shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `snifferName` | `string` | Yes | Unique name matching the plugin name |
| `filePath` | `string` | Yes | Absolute path to the file (use the `filePath` parameter as-is) |
| `line` | `number` | Yes | 1-based line number where the issue was found |
| `column` | `number` | Yes | 1-based column number |
| `message` | `string` | Yes | Human-readable description of the problem |
| `severity` | `string` | Yes | One of `"info"`, `"warning"`, or `"error"` |
| `suggestion` | `string` | Yes | Actionable advice on how to fix the issue |
| `details` | `object` | No | Arbitrary metadata (component name, counts, thresholds, etc.) |

## Register Your Plugin

Add the plugin to the `plugins` array in `.snifferrc.json`. The `path` is resolved relative to the config file's directory:

```json
{
  "frameworks": ["react"],
  "plugins": [
    {
      "path": "./plugins/no-console-log.js"
    }
  ]
}
```

You can also pass config overrides per-plugin:

```json
{
  "plugins": [
    {
      "path": "./plugins/no-console-log.js",
      "config": {
        "severity": "error"
      }
    }
  ]
}
```

The config is merged on top of the plugin's `meta.defaultConfig`, so you only need to specify the values you want to override.

## Validation

When a plugin is loaded, it goes through four validation stages. If any required stage fails, the plugin is rejected and a warning is printed.

### 1. Security Scan

The plugin source file is read and checked for dangerous patterns (see Security Restrictions below). Matches produce warnings but do not block loading.

### 2. Schema Check

The plugin module must export all required fields with the correct types:

| Export | Expected Type |
|---|---|
| `name` | `string` (non-empty) |
| `description` | `string` |
| `meta` | `object` |
| `detect` | `function` |

### 3. Meta Schema Check

The `meta` object must contain these fields:

| Field | Expected Type |
|---|---|
| `name` | `string` |
| `description` | `string` |
| `category` | `string` |
| `severity` | `string` |
| `defaultConfig` | `object` |

### 4. Function Signature Check

The `detect` function must accept at least 2 parameters (`fileContent` and `filePath`). A function with fewer than 2 declared parameters is rejected.

### 5. Smoke Test

The plugin's `detect` function is called with an empty string and a dummy file path (`"test.jsx"`). It must return an array without throwing an exception.

## Security Restrictions

The security scan checks the plugin source code for patterns that could be dangerous. These produce warnings in the console output:

| Blocked Pattern | Reason |
|---|---|
| `eval()` | Arbitrary code execution |
| `new Function()` | Dynamic code creation |
| `require('child_process')` | Process spawning |
| `require('net')`, `require('http')`, `require('https')`, `require('dgram')` | Network access |
| `require('cluster')` | Cluster access |
| `process.exit()` | Can kill the host process |
| `process.kill()` | Can kill other processes |
| `global.* =` or `globalThis.* =` | Global variable pollution |

These patterns generate warnings but do not prevent the plugin from loading. Review the warnings carefully before trusting a third-party plugin.

## Testing Your Plugin

Run only your plugin against a specific directory:

```bash
aps -s no-console-log --dir ./src
```

This disables all built-in sniffers and runs only the named sniffer. Note that `-s` works with plugin names the same way it works with built-in sniffer names.

You can also use the interactive TUI to browse plugin results:

```bash
aps -i -s no-console-log
```
