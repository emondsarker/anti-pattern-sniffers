# Changelog

All notable changes to `anti-pattern-sniffer` are documented in this file.

---

## [0.6.0] — 2026-03-28

### V5 False Positive Reduction

Targeted 30 false positives across 3 sniffers using pattern-specific exemptions.

#### Magic Strings

- **Skip `typeof` comparisons.** Strings like `'string'`, `'number'`, `'boolean'` on the right-hand side of `typeof x ===` are JavaScript language primitives — they cannot be extracted to constants meaningfully. (2 FPs fixed)

#### Prop Drilling

- **Specialization wrapper detection.** Components that provide 3+ default values in their destructuring (e.g., `title = 'Confirm Action'`) are preset/shorthand wrappers, not prop drillers. These exist to save callsites from repeating defaults. (7 FPs fixed)
- **List container detection.** Components that use `.map()` to render children need to pass shared props (selection state, search terms) to each item — this is inherent to the list pattern, not drilling. (4 FPs fixed)
- **Render-slot injection detection.** Props passed into render callbacks like `components={{ a: (props) => <Custom data={data} /> }}` are injected into library-controlled slots (e.g., ReactMarkdown), not drilled through a component tree. (4 FPs fixed)
- **Relaxed 2-child composition check.** Previously flagged components distributing to 2 children if either child received `>= minPassThroughProps`. Now skips if both children receive 2+ props each, recognizing genuine distribution. (6 FPs fixed)

#### Prop Explosion

- **Tree/recursive node bonus threshold (+4).** Components with a `level` or `depth` prop get an effective threshold of 11 (at default 7). Tree nodes inherently need: data + hierarchy position + expand/collapse + selection + action handlers. (5 FPs fixed)
- **SVG/positioning component bonus (+3).** Components with `x`, `y`, `width`, and `height` props get an effective threshold of 10. These are independent SVG coordinate values used in separate arithmetic. (1 FP fixed)

#### New Test Fixtures

- `specialization-with-defaults.jsx` — DeleteConfirmation preset wrapper
- `list-container.jsx` — TreeView mapping over folders
- `render-slot-injection.jsx` — ReactMarkdown component overrides
- `tree-node.jsx` — Recursive tree node (11 props)
- `svg-component.jsx` — GanttTaskBar with SVG positioning

#### Tests: 371 passing

---

## [0.5.0] — 2026-03-28

### V4 False Positive Reduction

Major accuracy improvements based on real-codebase analysis (V3 report: 109 issues, 47% FP rate).

#### Prop Explosion

- **Reverted threshold from 10 back to 7.** Re-analysis showed components at 8-10 props genuinely have groupable props (sort objects, label groups, handler groups). Threshold 7 correctly identifies these.

#### Prop Drilling

- **Multi-child composition detection.** New algorithm distinguishes drilling (all props → single child) from composition (props distributed across multiple children):
  - 3+ distinct child components → always skip (composition)
  - 2 children → only flag if one child receives all the pass-through props
- **`findReceivingChildren` function.** Scans backwards from each `propName={propName}` pattern to find the enclosing `<ComponentName`, tracking which children receive which props.

#### Magic Strings

- **Skip method-call return comparisons.** Patterns like `.getIsSorted() === 'asc'` are framework API contracts, not magic strings. Detected by checking if the text before `===` ends with `)`.
- **Extended union type extraction.** Now matches interface property types (`flowState: 'idle' | 'extracting'`) and function parameter types (`mode: 'edit' | 'view'`), not just `type` alias declarations.

#### New Test Fixtures

- `composition-distribution.jsx` — CategoryCard (2 children) and SourceSelectorPopover (3+ Radix primitives)
- `specialization-wrapper.jsx` — DeleteConfirmation with defaults

#### Tests: 363 passing

---

## [0.4.1] — 2026-03-28

### Threshold Adjustments

- Reverted `prop-explosion` threshold from 12 to 10 and `prop-drilling` `minPassThroughProps` from 5 to 4 based on user preference.

---

## [0.4.0] — 2026-03-28

### V3 False Positive Reduction

First major false positive reduction pass. Based on scanning a real production React codebase (290 issues, most were FPs).

#### Callback Hell

- **Skip `.tsx`/`.jsx` files entirely.** The callback-hell sniffer is designed for Express/Node.js callback patterns. All 4 detections in React files were false positives — React idioms (handlers, streaming callbacks, `.then()` continuations) don't map to Express callback hell.
- **BREAKING:** Callback-hell no longer reports on React files.

#### Magic Strings

- **Exempt case-label strings.** If a string appears as a `case` label anywhere in the file, it's a discriminated value — even if also used in `===` comparisons elsewhere.
- **Default `ignoredStrings`: `['all', 'none']`.** These are too generic to be meaningful magic strings.
- **BREAKING:** Default `ignoredStrings` now includes `'all'` and `'none'`.

#### Prop Drilling

- **Auto-whitelist `on[A-Z]*` event handlers.** Props like `onFileOpen`, `onDeleteTask`, `onValueChange` are by nature designed for parent→child passing. They accounted for the majority of false positives.
- **Expanded default whitelist.** Added: `isOpen`, `isLoading`, `disabled`, `loading`, `open`, `visible`.
- **Raised `minPassThroughProps` from 3 to 5.** Reduces noise from components forwarding a handful of props.
- **BREAKING:** Default `minPassThroughProps` raised from 3 to 5.

#### Prop Explosion

- **Raised default threshold from 10 to 12.** Clean separation: all FPs had ≤11 props, all TPs had ≥14.
- **Added `ignoredProps` config option.** Array of prop names to exclude from counting.
- **BREAKING:** Default threshold raised from 10 to 12.

#### New Test Fixtures

- `event-handler-passthrough.jsx`, `many-data-passthrough.jsx`
- `dialog-component.jsx` (prop-explosion true negative)
- `case-label-exempt.ts` (magic-strings true negative)

---

## [0.3.0] — 2026-03-28

### V2 False Positive Reduction

First false-positive pass across all 4 sniffers. Reduced total issues from 478 → 290 (-39%).

#### Callback Hell

- Exempt React hooks (`useEffect`, `useCallback`, `useMemo`, `useLayoutEffect`) from nesting depth.
- Exempt array method callbacks (`.map`, `.forEach`, `.filter`, etc.).
- Exempt state updater functions (`setState`, `setX`).

#### Magic Strings

- Exempt TypeScript union literal type values (`type Mode = 'a' | 'b'`).
- Exempt strings confined entirely to switch blocks.
- Added user-configurable `ignoredStrings` list.

#### Prop Drilling

- Added `minPassThroughProps` threshold (default 3) — components forwarding 1-2 props aren't flagged.
- Expanded default whitelist with common callbacks: `onChange`, `onClick`, `onSubmit`, `onClose`, `onOpenChange`.

#### Prop Explosion

- **Removed JSX attribute explosion detection.** Was flagging library component usage like `<Button variant="..." size="...">` — not a real anti-pattern.
- Raised default threshold from 7 to 10.
- **BREAKING:** JSX attribute detection removed. Default threshold raised to 10.

---

## [0.2.0] — 2026-03-27

### Monorepo & Multi-Framework Support

- **Workspace discovery** — auto-detects npm workspaces, pnpm workspaces, Yarn workspaces, Lerna, Nx, and Turborepo.
- **Multi-package orchestration** — `--packages`, `--include-packages`, `--exclude-packages` CLI flags.
- **Package-grouped output** — results organized by package in both text and TUI views.
- **Config inheritance** — workspace-level `.snifferrc.json` merged with per-package overrides.
- **Framework auto-detection** — detects React, Express, NestJS from `package.json` dependencies.
- **5 NestJS sniffers** — business-logic-in-controllers, god-service, magic-strings, missing-dtos, missing-guards.
- **6 Express sniffers** — callback-hell, fat-controllers, god-routes, hardcoded-secrets, missing-error-handling, no-input-validation.
- **Namespaced output** — framework prefix in sniffer names and TUI framework filter.
- **Interactive setup wizard** — `aps init` for guided configuration.
- **18 Claude Code slash commands** for development workflows.
- **Comprehensive documentation site** — 13 pages.

---

## [0.1.0] — 2026-03-26

### Initial Release

- **3 React sniffers** — prop-explosion, prop-drilling, god-hook.
- **Plugin system** with security validation and sandboxing.
- **Interactive TUI viewer** with keyboard navigation.
- **Iterative file discoverer** and worker thread pool for parallel analysis.
- **CLI** with JSON and Markdown output renderers.
- **164 unit and integration tests.**
