---
description: Generate a grouped changelog from git commit history
---

# Changelog

Generate a changelog from git history, grouped by conventional commit type.

Arguments: $ARGUMENTS

## Steps

1. **Determine the git log range** in `/home/emon/personal/react-anti-pattern-sniffer`:
   - If $ARGUMENTS is empty or blank: find the latest tag with `git describe --tags --abbrev=0`. Use the range `<tag>..HEAD`. If no tags exist, use all commits.
   - If $ARGUMENTS contains `..` (e.g., `v1.0.0..v1.1.0`): use it as-is as the range.
   - Otherwise treat $ARGUMENTS as a single ref and use `$ARGUMENTS..HEAD`.

2. **Get commits**: Run `git log <range> --oneline --no-decorate`.

3. **Group commits** by their conventional commit prefix into these categories:
   - `feat` / `feature` -> **Features**
   - `fix` -> **Bug Fixes**
   - `test` -> **Tests**
   - `docs` -> **Documentation**
   - `refactor` -> **Refactoring**
   - `chore` / `build` / `ci` -> **Maintenance**
   - Anything else -> **Other**

   Strip the prefix and scope from each entry so only the description remains (e.g., `feat: add X` becomes `Add X`). Capitalize the first letter.

4. **Output** a formatted markdown changelog with a header like `## Changelog (<range>)`, followed by each non-empty category as a `### Category` heading with bullet points.

5. Do NOT write the changelog to any file unless the user explicitly asks. Just output it as text.
