import { renderMarkdown } from './markdown-renderer.js';
import { renderJson } from './json-renderer.js';
import type { SnifferResult, SnifferConfig } from '../sniffers/sniffer-interface.js';

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
