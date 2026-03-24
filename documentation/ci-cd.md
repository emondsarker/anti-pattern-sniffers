# CI/CD Integration

## Exit Codes

| Code | Meaning |
|------|---------|
| `0`  | No anti-patterns found -- build passes |
| `1`  | Anti-patterns detected -- build should fail |
| `2`  | Runtime error (bad config, invalid flags) |

Any standard CI system can use these exit codes to gate merges.

## Husky Pre-Commit Hook

Block commits that introduce anti-patterns.

**Step 1: Install Husky**

```bash
npm install --save-dev husky
npx husky init
```

**Step 2: Create the hook file**

```bash
echo 'npx aps --quiet' > .husky/pre-commit
```

**Step 3: Verify the hook content**

`.husky/pre-commit` should contain:

```bash
npx aps --quiet
```

The `--quiet` flag suppresses output so your commit flow stays clean. If any anti-patterns are found, the hook exits with code 1 and the commit is blocked.

To scan only specific sniffers in the hook (faster):

```bash
npx aps -s hardcoded-secrets,missing-error-handling --quiet
```

## GitHub Actions

A complete workflow that fails the build when anti-patterns are found:

```yaml
name: Anti-Pattern Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  sniff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run anti-pattern sniffer
        run: npx aps --quiet
```

The workflow installs your project dependencies (which includes `anti-pattern-sniffer` as a dev dependency), then runs the scan. If any issues are found, the step fails with exit code 1 and the PR is blocked.

**To save a report as a build artifact:**

```yaml
      - name: Run anti-pattern sniffer
        run: npx aps --format json --output anti-pattern-report.json
        continue-on-error: true

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: anti-pattern-report
          path: anti-pattern-report.json
```

## JSON Output for Automation

Generate a machine-readable report for custom tooling:

```bash
npx aps --format json --output report.json
```

**Parse the report with jq:**

```bash
# Count total issues
cat report.json | jq '.totalIssues'

# List all files with issues
cat report.json | jq '.files | keys[]'

# Get only error-severity issues
cat report.json | jq '[.files[] | .[] | select(.severity == "error")]'
```

**Parse the report with Node.js:**

```js
const report = JSON.parse(require('fs').readFileSync('report.json', 'utf8'));

if (report.totalIssues > 5) {
  console.error(`Too many issues: ${report.totalIssues}`);
  process.exit(1);
}
```

## Quiet Mode

The `--quiet` flag suppresses all stdout output. The tool communicates only through its exit code.

```bash
npx aps --quiet
echo $?  # 0 = clean, 1 = issues found, 2 = error
```

This is the recommended flag for any automated environment where you only care about pass/fail.

## Fail Strategies

Different teams need different thresholds for failure. Here are common approaches.

**Block on any issue (strictest):**

```bash
npx aps --quiet
```

Exits 1 if any anti-pattern is found, regardless of severity.

**Block on specific sniffers only:**

```bash
npx aps -s hardcoded-secrets,missing-error-handling --quiet
```

Only fails if the listed sniffers find issues. All other anti-patterns are ignored.

**Block above a threshold (parse JSON):**

```bash
npx aps --format json --output report.json || true
ISSUES=$(cat report.json | jq '.totalIssues')
if [ "$ISSUES" -gt 10 ]; then
  echo "Too many anti-patterns: $ISSUES (max: 10)"
  exit 1
fi
```

The `|| true` prevents the non-zero exit from stopping the script before the threshold check runs.

**Block only on errors, allow warnings:**

```bash
npx aps --format json --output report.json || true
ERRORS=$(cat report.json | jq '[.files[][] | select(.severity == "error")] | length')
if [ "$ERRORS" -gt 0 ]; then
  echo "$ERRORS error-severity anti-patterns found"
  exit 1
fi
```
