import { renderMarkdown, renderMarkdownWorkspace } from './markdown-renderer.js';
import { renderJson, renderJsonWorkspace } from './json-renderer.js';
import type { SnifferResult, SnifferConfig, PackageResult } from '../sniffers/sniffer-interface.js';

export function formatOutput(
  results: Map<string, SnifferResult[]>,
  config: SnifferConfig,
): string {
  const configRecord = config as unknown as Record<string, unknown>;
  if (config.outputFormat === 'json') {
    return renderJson(results, configRecord);
  }
  return renderMarkdown(results, configRecord);
}

export function formatWorkspaceOutput(
  packageResults: PackageResult[],
  config: SnifferConfig,
): string {
  const configRecord = config as unknown as Record<string, unknown>;
  if (config.outputFormat === 'json') {
    return renderJsonWorkspace(packageResults, configRecord);
  }
  return renderMarkdownWorkspace(packageResults, configRecord);
}
