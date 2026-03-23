import { parentPort } from 'node:worker_threads';
import type { WorkerTask, SnifferExport, SnifferResult, WorkerResultMessage, WorkerErrorMessage } from '../sniffers/sniffer-interface.js';

if (!parentPort) {
  throw new Error('worker-runner.ts must be run as a worker thread');
}

const port = parentPort;

port.on('message', (msg: WorkerTask | { type: 'shutdown' }) => {
  if (msg.type === 'shutdown') {
    process.exit(0);
  }

  if (msg.type === 'run-sniffer') {
    const { taskId, snifferPath, fileContent, filePath, config } = msg;
    const startTime = Date.now();

    try {
      // Load the sniffer module
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const raw = require(snifferPath);
      const snifferModule: SnifferExport = raw.default ?? raw;

      // Freeze config to prevent mutation by plugins
      const frozenConfig = Object.freeze({ ...config });

      // Run detection
      const detections = snifferModule.detect(fileContent, filePath, frozenConfig);

      // Validate return value
      if (!Array.isArray(detections)) {
        throw new Error(`Sniffer "${snifferModule.name}" did not return an array`);
      }

      const result: SnifferResult = {
        snifferName: snifferModule.name,
        filePath,
        detections,
        durationMs: Date.now() - startTime,
        error: null,
      };

      const response: WorkerResultMessage = {
        type: 'sniffer-result',
        taskId,
        result,
      };

      port.postMessage(response);
    } catch (err) {
      const response: WorkerErrorMessage = {
        type: 'sniffer-error',
        taskId,
        error: err instanceof Error ? err.message : String(err),
      };

      port.postMessage(response);
    }
  }
});
