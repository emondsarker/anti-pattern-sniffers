# .snifferignore

## What It Does

The `.snifferignore` file tells `aps` to skip specific detections. It works like `.gitignore` but instead of ignoring files from version control, it ignores anti-pattern detections from the scan results.

Use it to suppress false positives or to accept known issues that you do not plan to fix.

## File Location

Place the file in your project root. In a monorepo, each package can have its own `.snifferignore` in its package directory.

```
my-project/
  .snifferignore       # project-level ignores
  src/
    components/
    hooks/
```

## Format

Each line specifies a file path, optionally narrowed to a specific component and/or sniffer:

```
# Ignore ALL issues in a file
src/legacy/OldComponent.tsx

# Ignore a specific component in a file (for any sniffer)
src/components/Dashboard.tsx:Dashboard

# Ignore a specific component for a specific sniffer
src/components/Dashboard.tsx:Dashboard  # prop-explosion

# Ignore a specific hook for a specific sniffer
src/hooks/useEverything.ts:useEverything  # god-hook

# Ignore all detections of a sniffer in a file (any component)
src/legacy/BigForm.tsx  # prop-explosion
```

## Syntax

| Pattern | What It Ignores |
|---|---|
| `path` | All issues in that file, from all sniffers |
| `path:ComponentName` | All issues for that component/hook in that file |
| `path:ComponentName  # sniffer-name` | Only issues for that component from that specific sniffer |
| `path  # sniffer-name` | All issues from that sniffer in that file (any component) |

The path is relative to the project root (or package root in workspace mode). The sniffer name after `#` must be separated by two spaces and a `#` character (`  #`).

## Comments

Lines starting with `#` are treated as comments and ignored:

```
# Legacy components -- accepted tech debt
src/legacy/OldDashboard.tsx

# Will fix in Q3
src/hooks/useGlobalState.ts:useGlobalState  # god-hook
```

Inline comments after `  #` (two spaces + hash) are parsed as sniffer name filters, not as freeform comments.

## Auto-Generate from TUI

The fastest way to add entries is through the interactive TUI:

1. Run `aps -i` to open the interactive viewer.
2. Navigate to the detection you want to ignore using `j`/`k` or arrow keys.
3. Press `x`.
4. The TUI appends an entry to `.snifferignore` and removes the detection from the view. A green flash message confirms the action.

The generated entry uses the most specific format available. If the detection has a component or hook name in its details, the entry is `path:ComponentName  # sniffer-name`. Otherwise it uses `path  # sniffer-name`.

```
# Auto-generated entry after pressing x on a prop-explosion detection:
src/components/Dashboard.tsx:Dashboard  # prop-explosion
```

## How Matching Works

When filtering results, each detection is checked against every ignore entry:

1. The detection's file path (relative to project root) is compared to the entry's path. Both must match.
2. If the entry specifies a sniffer name, the detection's sniffer name must also match.
3. If the entry specifies a component name, the detection's `componentName` or `hookName` from its details metadata must match.

If all specified fields match, the detection is excluded from the report.
