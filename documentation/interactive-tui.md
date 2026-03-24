# Interactive TUI

## Launch

Start the interactive viewer by passing the `-i` flag:

```bash
aps -i
```

The TUI requires a TTY terminal. If stdin is not a TTY (e.g., piped input), it falls back to printing a markdown report to stdout.

## What You See

The TUI renders a full-screen interface with four regions:

```
  Anti-Pattern Sniffer  |  12/42 issues shown  *  87 files scanned
  Batch size: 10 (use -b to change)
  ──────────────────────────────────────────────────────────
  > v Prop Explosion (4 issues)
      * src/components/Dashboard.tsx:23 Dashboard -- Too many props (12)
      * src/components/UserCard.tsx:8 UserCard -- Too many props (9)
      ...
    v God Hook (3 issues)
      * src/hooks/useApp.ts:5 useApp -- Hook does too much
      ...
  ──────────────────────────────────────────────────────────
  [c]opy as prompt  [a]ll as md  [x] ignore  [f]ilter  [F]ramework  [P]ackage  [d]etails  [q]uit
  up/down navigate  left/right or enter collapse/expand  tab next group
```

The header shows how many issues are displayed out of the total, plus the number of files scanned. Results are grouped by sniffer name (or by package and sniffer name in workspace mode). Each detection shows a severity indicator, the file path with line number, the component or hook name, and a short message. The action bar at the bottom lists all available keybindings.

## Keybindings

| Key | Action |
|---|---|
| `Up` or `k` | Move cursor up |
| `Down` or `j` | Move cursor down |
| `Enter` or `Right` or `l` | Toggle collapse/expand on a group header |
| `Left` or `h` | Collapse the current group (moves cursor to group header) |
| `Tab` | Jump to the next group header (wraps around) |
| `d` | Toggle detail panel for the selected detection |
| `c` | Copy selected detection as an AI-ready markdown prompt |
| `a` | Copy all visible issues as a markdown report |
| `x` | Ignore the selected detection (appends to `.snifferignore`) |
| `p` | Print selected detection markdown to the screen |
| `f` | Cycle through smell filters (or clear filter) |
| `F` | Cycle through framework filters (or clear filter) |
| `P` | Cycle through package filters -- workspace mode only |
| `q` or `Ctrl+C` | Quit the TUI |

## Workflow Example

A typical workflow for fixing an anti-pattern:

1. Run `aps -i` to launch the TUI.
2. Use `j`/`k` or arrow keys to navigate to an issue you want to fix.
3. Press `d` to expand the details panel. You will see the full message, suggestion text, and a JSON dump of detection metadata.
4. Press `c` to copy the detection as a markdown prompt. The TUI flashes a green confirmation message.
5. Paste the copied markdown into ChatGPT, Claude, or your preferred AI tool. The prompt includes the file path, line number, message, and suggestion -- everything the AI needs to generate a fix.
6. Apply the fix in your editor, then re-run `aps -i` to confirm the issue is gone.

## Batch Mode

By default the TUI shows 10 issues. Use the `-b` flag to change the batch size:

```bash
aps -i -b 20
```

When the batch size is smaller than the total issue count, the header displays a notice:

```
  Batch size: 20 (use -b to change)
```

This keeps the TUI responsive on large codebases. You can increase the batch size to see more issues at once, or use filters to narrow down results instead.

## Filters

Three filter keys let you narrow results without leaving the TUI:

- `f` cycles through individual sniffer names (e.g., `prop-explosion`, then `god-hook`, then back to showing all).
- `F` cycles through framework prefixes (e.g., `react`, `express`, `nestjs`).
- `P` cycles through package names (only available in workspace/monorepo mode).

When a filter is active, its label in the action bar turns yellow:

```
  [f]ilter: prop-explosion   [F]ramework   [P]ackage
```

Press the same key repeatedly to cycle through options. The last press clears the filter and shows all results again.

## Copy as AI Prompt

When you press `c` on a detection item, the TUI copies markdown like this to your clipboard:

```markdown
## Prop Explosion -- `src/components/Dashboard.tsx:23`

Component "Dashboard" has 12 props, which exceeds the threshold of 7.

### Suggestion
Split this component into smaller, focused components. Group related props
into a single object prop or use React Context for shared state.

### Details
```json
{
  "componentName": "Dashboard",
  "propCount": 12,
  "threshold": 7
}
```
```

This format gives an AI assistant all the context it needs: the anti-pattern name, exact file location, what is wrong, and a suggestion for how to fix it.

If no clipboard tool is available (xclip, xsel, pbcopy, or clip.exe), the TUI shows a fallback message suggesting you press `p` to print the markdown to the screen instead.

## Copy All as Markdown

Press `a` to copy every visible issue (respecting active filters) as a full markdown report. This is useful for pasting into a project issue tracker or sharing with your team.
