import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { SnifferConfig, SnifferResult, SnifferExport, Detection } from '../sniffers/sniffer-interface.js';
import { discoverFiles } from './file-discoverer.js';
import { SnifferRegistry } from './sniffer-registry.js';
import { WorkerPool } from './worker-pool.js';
import { formatOutput } from '../output/formatter.js';
import { debug, info, warn, step, success, fileProgress } from '../utils/logger.js';
import { loadSnifferIgnore, applySnifferIgnore } from './sniffer-ignore.js';

export interface OrchestrateResult {
  output: string;
  issueCount: number;
  fileCount: number;
  grouped: Map<string, SnifferResult[]>;
}

/**
 * Main orchestration pipeline.
 * Discovers files, loads sniffers, dispatches to workers, collects results, formats output.
 */
export async function orchestrate(config: SnifferConfig, targetDir: string): Promise<OrchestrateResult> {
  const startTime = Date.now();

  // 1. Discover target files
  step(`Scanning ${relative(process.cwd(), targetDir) || '.'} for source files...`);
  const files = discoverFiles(config.include, config.exclude, targetDir);

  if (files.length === 0) {
    warn('No matching files found.');
    const emptyResults = new Map<string, SnifferResult[]>();
    return { output: formatOutput(emptyResults, config), issueCount: 0, fileCount: 0, grouped: emptyResults };
  }

  success(`Found ${files.length} file${files.length === 1 ? '' : 's'} to analyze`);

  // 2. Build sniffer registry
  step('Loading sniffers...');
  const registry = new SnifferRegistry();
  registry.registerBuiltIn();

  // Register plugins
  for (const pluginEntry of config.plugins) {
    info(`  Loading plugin: ${pluginEntry.path}`);
    registry.registerPlugin(pluginEntry, targetDir);
  }

  // 3. Get enabled sniffers
  const enabledSniffers = registry.getEnabledSniffers(config.sniffers);

  if (enabledSniffers.length === 0) {
    warn('No sniffers enabled.');
    const emptyResults = new Map<string, SnifferResult[]>();
    return { output: formatOutput(emptyResults, config), issueCount: 0, fileCount: files.length, grouped: emptyResults };
  }

  success(`${enabledSniffers.length} sniffer${enabledSniffers.length === 1 ? '' : 's'} active: ${enabledSniffers.map(s => s.name).join(', ')}`);

  // 4. Run sniffers
  const allResults: SnifferResult[] = [];
  const mode = config.parallel && files.length > 1 ? 'parallel' : 'sequential';
  const totalTasks = files.length * enabledSniffers.length;
  let completedTasks = 0;

  step(`Running analysis (${mode}, ${totalTasks} tasks across ${files.length} files)...`);

  if (mode === 'parallel') {
    // Parallel mode via worker pool
    const workerScript = join(__dirname, 'worker-runner.js');
    const pool = new WorkerPool(workerScript, config.maxWorkers);
    debug(`Worker pool started with ${config.maxWorkers} workers`);

    try {
      const tasks: Promise<void>[] = [];

      for (const filePath of files) {
        const fileContent = readFileSync(filePath, 'utf8');

        for (const sniffer of enabledSniffers) {
          const task = pool
            .runTask(sniffer.snifferPath, fileContent, filePath, sniffer.config, config.timeoutMs)
            .then(msg => {
              allResults.push(msg.result);
              completedTasks++;
              fileProgress(completedTasks, totalTasks, relative(targetDir, filePath));
            })
            .catch(err => {
              allResults.push({
                snifferName: sniffer.name,
                filePath,
                detections: [],
                durationMs: 0,
                error: err instanceof Error ? err.message : String(err),
              });
              completedTasks++;
            });

          tasks.push(task);
        }
      }

      await Promise.allSettled(tasks);
    } finally {
      await pool.destroy();
      debug('Worker pool destroyed');
    }
  } else {
    // Sequential mode — run in main thread
    for (let fi = 0; fi < files.length; fi++) {
      const filePath = files[fi];
      const fileContent = readFileSync(filePath, 'utf8');

      for (const sniffer of enabledSniffers) {
        const startTimeTask = Date.now();
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const raw = require(sniffer.snifferPath);
          const snifferModule: SnifferExport = raw.default ?? raw;
          const detections = snifferModule.detect(fileContent, filePath, sniffer.config);

          allResults.push({
            snifferName: sniffer.name,
            filePath,
            detections: Array.isArray(detections) ? detections : [],
            durationMs: Date.now() - startTimeTask,
            error: null,
          });
        } catch (err) {
          allResults.push({
            snifferName: sniffer.name,
            filePath,
            detections: [],
            durationMs: Date.now() - startTimeTask,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        completedTasks++;
        fileProgress(completedTasks, totalTasks, relative(targetDir, filePath));
      }
    }
  }

  // 5. Apply .snifferignore
  const ignoreEntries = loadSnifferIgnore(targetDir);
  const filteredResults = ignoreEntries.length > 0
    ? applySnifferIgnore(allResults, ignoreEntries, targetDir)
    : allResults;

  if (ignoreEntries.length > 0) {
    const beforeCount = allResults.reduce((s, r) => s + r.detections.length, 0);
    const afterCount = filteredResults.reduce((s, r) => s + r.detections.length, 0);
    const ignored = beforeCount - afterCount;
    if (ignored > 0) {
      debug(`Filtered ${ignored} detection(s) via .snifferignore`);
    }
  }

  // 6. Group results by file path
  const grouped = new Map<string, SnifferResult[]>();
  for (const result of filteredResults) {
    const existing = grouped.get(result.filePath) || [];
    existing.push(result);
    grouped.set(result.filePath, existing);
  }

  // Log any errors
  let errorCount = 0;
  for (const result of filteredResults) {
    if (result.error) {
      errorCount++;
      warn(`Sniffer "${result.snifferName}" failed on "${relative(targetDir, result.filePath)}": ${result.error}`);
    }
  }

  // 6. Count total issues
  let issueCount = 0;
  for (const result of filteredResults) {
    issueCount += result.detections.length;
  }

  const elapsed = Date.now() - startTime;
  const filesPerSec = Math.round(files.length / (elapsed / 1000));

  if (issueCount > 0) {
    step(`Found ${issueCount} issue${issueCount === 1 ? '' : 's'} in ${elapsed}ms (${filesPerSec} files/sec)`);
  } else {
    success(`No issues found! Scanned ${files.length} files in ${elapsed}ms (${filesPerSec} files/sec)`);
  }

  if (errorCount > 0) {
    warn(`${errorCount} sniffer error${errorCount === 1 ? '' : 's'} occurred (see above)`);
  }

  // 7. Format and return output
  step('Generating report...');
  const output = formatOutput(grouped, config);
  success('Done!');

  return {
    output,
    issueCount,
    fileCount: files.length,
    grouped,
  };
}
