import { parseArgs } from './arg-parser.js';
import { loadConfig } from './config-loader.js';
import { printHelp, printVersion } from './help.js';
import { runInitWizard } from './init-wizard.js';
import { orchestrate } from '../core/orchestrator.js';
import { interactiveViewer } from '../tui/interactive-viewer.js';
import { formatOutput } from '../output/formatter.js';
import { setLogLevel } from '../utils/logger.js';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { SnifferResult } from '../sniffers/sniffer-interface.js';

const DEFAULT_BATCH_SIZE = 10;

/**
 * Apply a batch limit to grouped results — keeps only the first N detections total.
 */
function applyBatchLimit(
  grouped: Map<string, SnifferResult[]>,
  batchSize: number,
): Map<string, SnifferResult[]> {
  const limited = new Map<string, SnifferResult[]>();
  let remaining = batchSize;

  for (const [filePath, results] of grouped) {
    if (remaining <= 0) break;

    const limitedResults: SnifferResult[] = [];
    for (const result of results) {
      if (remaining <= 0) break;
      if (result.detections.length <= remaining) {
        limitedResults.push(result);
        remaining -= result.detections.length;
      } else {
        limitedResults.push({
          ...result,
          detections: result.detections.slice(0, remaining),
        });
        remaining = 0;
      }
    }

    if (limitedResults.length > 0) {
      limited.set(filePath, limitedResults);
    }
  }

  return limited;
}

async function main(): Promise<void> {
  const { flags, positionals } = parseArgs(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  if (flags.version) {
    printVersion();
    process.exit(0);
  }

  // Handle 'init' subcommand
  if (positionals[0] === 'init') {
    await runInitWizard();
    process.exit(0);
  }

  const isInteractive = flags.interactive === true;
  const hasBatchFlag = flags.batch !== undefined;

  if (flags.verbose) {
    setLogLevel('debug');
  } else if (flags.quiet || isInteractive) {
    setLogLevel(isInteractive ? 'warn' : 'silent');
  }

  // Parse batch size
  let batchSize = DEFAULT_BATCH_SIZE;
  if (typeof flags.batch === 'string') {
    const n = parseInt(flags.batch, 10);
    if (isNaN(n) || n < 1) {
      console.error(`Invalid batch size "${flags.batch}". Must be a positive integer.`);
      process.exit(2);
    }
    batchSize = n;
  }

  try {
    const config = loadConfig(flags);
    const targetDir = typeof flags.dir === 'string'
      ? resolve(flags.dir)
      : positionals[0]
        ? resolve(positionals[0])
        : process.cwd();

    const result = await orchestrate(config, targetDir);

    if (isInteractive) {
      await interactiveViewer(
        result.grouped,
        result.issueCount,
        result.fileCount,
        targetDir,
        batchSize,
      );
      process.exit(result.issueCount > 0 ? 1 : 0);
    }

    // Apply batch limit if -b flag is used (even in non-interactive mode)
    let outputStr: string;
    if (hasBatchFlag) {
      const limited = applyBatchLimit(result.grouped, batchSize);
      outputStr = formatOutput(limited, config);
    } else {
      outputStr = result.output;
    }

    if (config.outputPath) {
      writeFileSync(config.outputPath, outputStr, 'utf8');
    } else if (!flags.quiet) {
      process.stdout.write(outputStr);
    }

    process.exit(result.issueCount > 0 ? 1 : 0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}

main();
