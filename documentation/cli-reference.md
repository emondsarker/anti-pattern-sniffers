# CLI Reference

## Usage

```
aps [options] [dir]
```

The binary is available as `aps`, `sniff`, `ras`, or `react-sniff` -- all are aliases for the same command.

## Subcommands

| Command    | Description                                      |
|------------|--------------------------------------------------|
| `aps init` | Run the interactive setup wizard to generate a `.snifferrc.json` config file |

## Flags

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `-d, --dir <path>` | `-d` | Target directory to scan | Current working directory |
| `-c, --config <path>` | `-c` | Path to config file | Auto-detected (see [Configuration](./configuration.md)) |
| `-s, --sniffers <list>` | `-s` | Comma-separated list of sniffers to run | All enabled sniffers |
| `-f, --format <type>` | `-f` | Output format: `markdown` or `json` | `markdown` |
| `-o, --output <path>` | `-o` | Write report to a file instead of stdout | stdout |
| `-w, --workers <n>` | `-w` | Number of worker threads for parallel execution | `4` |
| `-i, --interactive` | `-i` | Launch the interactive TUI to browse results | `false` |
| `-b, --batch <n>` | `-b` | Limit output to first N issues | `10` |
| `--parallel` | -- | Enable parallel execution | `true` |
| `--no-parallel` | -- | Disable parallel execution | -- |
| `--verbose` | -- | Show debug output | `false` |
| `-q, --quiet` | `-q` | Suppress all output; exit code only | `false` |
| `-h, --help` | `-h` | Show help message | -- |
| `-v, --version` | `-v` | Show version number | -- |
| `-W, --workspace` | `-W` | Force workspace/monorepo mode | Auto-detected |
| `--no-workspace` | -- | Force single-project mode (skip monorepo detection) | -- |
| `--packages <dirs>` | -- | Comma-separated package directories for workspace mode | Auto-detected |
| `--package-filter <p>` | -- | Only scan packages matching this pattern | All packages |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0`  | No anti-patterns found |
| `1`  | One or more anti-patterns detected |
| `2`  | Runtime error (bad config, invalid flag, parse failure) |

## Examples

**Scan the current directory with defaults:**

```bash
aps
```

**Scan a specific directory:**

```bash
aps src/
# or
aps --dir src/
```

**Run only React sniffers:**

```bash
aps -s prop-explosion,god-hook,prop-drilling
```

**JSON output written to a file:**

```bash
aps --format json --output report.json
```

**Show only the first 5 issues:**

```bash
aps -b 5
```

**Launch interactive TUI:**

```bash
aps -i
```

**Workspace mode with a package filter:**

```bash
aps -W --package-filter "apps/*"
```

**Quiet mode for CI (exit code only, no output):**

```bash
aps --quiet
```

**Combined flags -- scan `src/`, run only `hardcoded-secrets`, output JSON quietly:**

```bash
aps -d src/ -s hardcoded-secrets -f json -o secrets.json -q
```

**Disable parallel execution with verbose logging:**

```bash
aps --no-parallel --verbose
```
