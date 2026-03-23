import type { SnifferResult, Detection } from '../sniffers/sniffer-interface.js';

interface JsonReport {
  meta: {
    fileCount: number;
    totalIssues: number;
    date: string;
    sniffersRun: string[];
  };
  files: Record<string, Detection[]>;
  summary: Record<string, { count: number; severity: string }>;
  errors: Array<{ snifferName: string; filePath: string; error: string }>;
}

export function renderJson(
  results: Map<string, SnifferResult[]>,
  _config: Record<string, unknown>,
): string {
  const sniffersRun = new Set<string>();
  const files: Record<string, Detection[]> = {};
  const summary: Record<string, { count: number; severity: string }> = {};
  const errors: Array<{ snifferName: string; filePath: string; error: string }> = [];
  let totalIssues = 0;

  for (const [, snifferResults] of results) {
    for (const result of snifferResults) {
      sniffersRun.add(result.snifferName);

      // Collect errors
      if (result.error) {
        errors.push({
          snifferName: result.snifferName,
          filePath: result.filePath,
          error: result.error,
        });
      }

      // Collect detections grouped by file
      for (const detection of result.detections) {
        if (!files[detection.filePath]) {
          files[detection.filePath] = [];
        }
        files[detection.filePath].push(detection);
        totalIssues++;

        // Build summary
        if (!summary[detection.snifferName]) {
          summary[detection.snifferName] = { count: 0, severity: detection.severity };
        }
        summary[detection.snifferName].count++;
      }
    }
  }

  const report: JsonReport = {
    meta: {
      fileCount: results.size,
      totalIssues,
      date: new Date().toISOString().split('T')[0],
      sniffersRun: [...sniffersRun],
    },
    files,
    summary,
    errors,
  };

  return JSON.stringify(report, null, 2);
}
