---
description: Prepare a release by bumping version, building, testing, and tagging
---

# Release

Prepare a release. The bump type is provided as an argument: `patch`, `minor`, or `major`.

Bump type: $ARGUMENTS

## Steps

1. **Pre-flight checks** (STOP on any failure):
   - Run `git status --porcelain` in `/home/emon/personal/react-anti-pattern-sniffer`. If there is any output, STOP and tell the user the working tree must be clean before releasing.
   - Run `git branch --show-current`. If the branch is not `main`, STOP and tell the user releases must be made from the `main` branch.
   - Read `package.json` and note the current version.
   - Validate that $ARGUMENTS is exactly one of: `patch`, `minor`, or `major`. If not, STOP and show usage.

2. **Calculate new version** from the current version and the bump type. Report: `Current: X.Y.Z -> New: A.B.C`.

3. **Build**: Run `npm run build`. STOP if it fails and report errors.

4. **Test**: Run `npm test`. STOP if any tests fail and report the failures. Do not proceed.

5. **Update version**: Run `npm version $ARGUMENTS --no-git-tag-version` to bump the version in package.json and package-lock.json without creating a git tag or commit.

6. **Commit**: Stage `package.json` and `package-lock.json`, then create a commit with the message `release: v<new-version>`.

7. **Tag**: Run `git tag v<new-version>`.

8. **Done**: Tell the user the release is prepared locally. Instruct them to run the following when ready:
   ```
   git push && git push --tags
   npm publish
   ```
