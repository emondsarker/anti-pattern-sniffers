# Sniffers Overview

## What is a Sniffer?

A sniffer is a detection rule that scans your source files for a specific anti-pattern. Each sniffer uses regex-based heuristics -- no AST parsing, no dependencies. This makes sniffers fast, portable, and easy to write.

Sniffers read your file as plain text, apply pattern matching, and return a list of detections with file location, severity, and a suggestion for how to fix the issue.

## All 14 Sniffers

| Sniffer | Framework | Category | Default Severity | Key Threshold |
|---|---|---|---|---|
| `prop-explosion` | React | props | warning | `threshold: 7` props |
| `god-hook` | React | hooks | warning | `maxUseState: 4`, `maxUseEffect: 3`, `maxTotalHooks: 10` |
| `prop-drilling` | React | props | warning | N/A (detects pass-through props) |
| `god-routes` | Express | routing | warning | `maxRoutes: 10` |
| `missing-error-handling` | Express | routing | warning | N/A (checks for try-catch or error middleware) |
| `fat-controllers` | Express | architecture | warning | `maxLines: 50`, `maxAwaits: 3` |
| `no-input-validation` | Express | validation | warning | N/A (checks for validation library import) |
| `callback-hell` | Express | architecture | warning | `maxDepth: 3` |
| `hardcoded-secrets` | Express | security | error | N/A (pattern-based detection) |
| `god-service` | NestJS | dependency-injection | warning | `maxDependencies: 8`, `maxPublicMethods: 15` |
| `missing-dtos` | NestJS | validation | warning | N/A (checks for type annotations and decorators) |
| `business-logic-in-controllers` | NestJS | architecture | warning | `maxMethodLines: 50` |
| `missing-guards` | NestJS | architecture | warning | N/A (checks sensitive routes for `@UseGuards`) |
| `magic-strings` | NestJS | custom | warning | `minOccurrences: 3` |

## Severity Levels

Each detection has a severity that tells you how urgent the issue is.

| Level | Meaning | Example |
|---|---|---|
| `info` | Observation, not necessarily a problem. Useful during code review. | A component has 6 props (just under the threshold). |
| `warning` | Likely a design issue. Should be addressed before the codebase grows. | A custom hook uses 5 `useState` calls and 4 `useEffect` calls. |
| `error` | A serious problem that should be fixed immediately. | A hardcoded database password found in source code. |

## Categories

Sniffers are grouped by category so you can reason about which areas of your code need attention.

| Category | Frameworks | Description |
|---|---|---|
| `props` | React | Problems with how data is passed between components. |
| `hooks` | React | Misuse or overuse of React hooks in custom hooks. |
| `routing` | Express | Route file organization and handler error safety. |
| `architecture` | Express, NestJS | Structural problems like fat handlers or misplaced logic. |
| `validation` | Express, NestJS | Missing input validation on request data. |
| `security` | Express | Hardcoded secrets, API keys, and credentials. |
| `dependency-injection` | NestJS | Services with too many dependencies (Single Responsibility violations). |
| `custom` | NestJS | Code quality issues like magic strings in conditionals. |

## Enable/Disable Sniffers

Create a `.snifferrc.json` file in your project root. Set any sniffer to `false` to disable it entirely.

```json
{
  "sniffers": {
    "prop-explosion": {
      "threshold": 7
    },
    "callback-hell": false,
    "hardcoded-secrets": {
      "severity": "warning"
    }
  }
}
```

In this example, `callback-hell` is disabled. The other sniffers run with customized settings. Any sniffer not listed uses its defaults.

## Customize Thresholds

You can override default thresholds in `.snifferrc.json` to match your team's standards.

```json
{
  "sniffers": {
    "prop-explosion": {
      "threshold": 5,
      "severity": "error"
    },
    "god-hook": {
      "maxUseState": 3,
      "maxUseEffect": 2,
      "maxTotalHooks": 8
    },
    "fat-controllers": {
      "maxLines": 30,
      "maxAwaits": 2
    }
  }
}
```

This makes `prop-explosion` stricter (5 props instead of 7, elevated to error), tightens the god-hook limits, and shortens the allowed handler size for Express routes.

## Run Specific Sniffers

Use the `-s` flag to run only certain sniffers. Separate multiple names with commas.

```bash
aps -s prop-explosion,god-hook
```

This runs only the `prop-explosion` and `god-hook` sniffers and skips everything else. Useful when you want to focus on a specific category of issues.

```bash
aps -s hardcoded-secrets
```

This runs only the secret detection sniffer -- handy as a pre-commit check.
