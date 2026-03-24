import type { WorkspaceInfo, WorkspaceResult, PackageResult } from '../sniffers/sniffer-interface.js';
import { loadConfigForPackage } from '../cli/config-loader.js';
import { orchestrate } from './orchestrator.js';
import { loadSnifferIgnore } from './sniffer-ignore.js';
import { formatWorkspaceOutput } from '../output/formatter.js';
import { step, success } from '../utils/logger.js';

export async function orchestrateWorkspace(
  workspace: WorkspaceInfo,
  flags: Record<string, string | boolean>,
): Promise<WorkspaceResult> {
  const packageResults: PackageResult[] = [];
  let totalIssueCount = 0;
  let totalFileCount = 0;

  step(`Workspace detected (${workspace.type}): ${workspace.packages.length} packages`);

  // Load root-level .snifferignore (applies to all packages)
  const rootIgnore = loadSnifferIgnore(workspace.rootDir);

  // Apply package filter if specified
  let packages = workspace.packages;
  if (typeof flags['package-filter'] === 'string') {
    const filter = flags['package-filter'];
    packages = packages.filter(pkg =>
      pkg.name.includes(filter) || pkg.relativePath.includes(filter),
    );
    step(`Filtered to ${packages.length} packages matching "${filter}"`);
  }

  for (const pkg of packages) {
    step(`Scanning package: ${pkg.name} (${pkg.relativePath})`);

    // Load config with inheritance: default -> root -> package -> CLI flags
    const config = loadConfigForPackage(flags, workspace.rootDir, pkg.path);

    // Merge root + package ignore entries
    const pkgIgnore = loadSnifferIgnore(pkg.path);
    const mergedIgnore = [...rootIgnore, ...pkgIgnore];

    // Run the existing orchestrator on this package
    const result = await orchestrate(config, pkg.path, mergedIgnore);

    packageResults.push({
      package: pkg,
      result,
      frameworks: config.frameworks || [],
    });

    totalIssueCount += result.issueCount;
    totalFileCount += result.fileCount;
  }

  success(`Workspace scan complete: ${totalIssueCount} issues across ${totalFileCount} files in ${packages.length} packages`);

  // Use root config for workspace-level formatting
  const rootConfig = loadConfigForPackage(flags, workspace.rootDir, workspace.rootDir);
  const output = formatWorkspaceOutput(packageResults, rootConfig);

  return {
    packages: packageResults,
    totalIssueCount,
    totalFileCount,
    output,
  };
}
