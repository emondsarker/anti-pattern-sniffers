import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import type { WorkerTask, WorkerResultMessage, WorkerErrorMessage } from '../sniffers/sniffer-interface.js';

interface QueueEntry {
  task: WorkerTask;
  resolve: (result: WorkerResultMessage) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
}

interface WorkerEntry {
  worker: Worker;
  busy: boolean;
  currentTaskId: string | null;
}

/**
 * A fixed-size worker thread pool for running sniffers in parallel.
 * Pre-spawns workers, queues tasks when all workers are busy,
 * and enforces per-task timeouts.
 */
export class WorkerPool {
  private workers: WorkerEntry[] = [];
  private taskQueue: QueueEntry[] = [];
  private pendingTasks = new Map<string, QueueEntry & { workerEntry: WorkerEntry }>();
  private workerScript: string;
  private poolSize: number;
  private destroyed = false;

  constructor(workerScript: string, poolSize: number) {
    this.workerScript = workerScript;
    this.poolSize = Math.max(1, poolSize);

    for (let i = 0; i < this.poolSize; i++) {
      this.workers.push(this.createWorker());
    }
  }

  private createWorker(): WorkerEntry {
    const worker = new Worker(this.workerScript, {
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32,
        codeRangeSizeMb: 16,
      },
    });

    const entry: WorkerEntry = { worker, busy: false, currentTaskId: null };

    worker.on('message', (msg: WorkerResultMessage | WorkerErrorMessage) => {
      const taskId = msg.taskId;
      const pending = this.pendingTasks.get(taskId);
      if (!pending) return;

      // Clear timeout
      if (pending.timer) clearTimeout(pending.timer);
      this.pendingTasks.delete(taskId);

      // Mark worker as available
      entry.busy = false;
      entry.currentTaskId = null;

      if (msg.type === 'sniffer-result') {
        pending.resolve(msg);
      } else {
        pending.reject(new Error(msg.error));
      }

      // Process next queued task
      this.processQueue();
    });

    worker.on('error', (err: Error) => {
      // Worker crashed — reject current task and replace worker
      if (entry.currentTaskId) {
        const pending = this.pendingTasks.get(entry.currentTaskId);
        if (pending) {
          if (pending.timer) clearTimeout(pending.timer);
          this.pendingTasks.delete(entry.currentTaskId);
          pending.reject(new Error(`Worker crashed: ${err.message}`));
        }
      }

      // Replace the crashed worker
      const idx = this.workers.indexOf(entry);
      if (idx !== -1 && !this.destroyed) {
        this.workers[idx] = this.createWorker();
        this.processQueue();
      }
    });

    worker.on('exit', (code: number) => {
      if (code !== 0 && entry.currentTaskId) {
        const pending = this.pendingTasks.get(entry.currentTaskId);
        if (pending) {
          if (pending.timer) clearTimeout(pending.timer);
          this.pendingTasks.delete(entry.currentTaskId);
          pending.reject(new Error(`Worker exited with code ${code}`));
        }
      }

      // Replace exited worker if not shutting down
      const idx = this.workers.indexOf(entry);
      if (idx !== -1 && !this.destroyed) {
        this.workers[idx] = this.createWorker();
        this.processQueue();
      }
    });

    return entry;
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    const idle = this.workers.find(w => !w.busy);
    if (!idle) return;

    const queueEntry = this.taskQueue.shift()!;
    this.assignTask(idle, queueEntry);
  }

  private assignTask(workerEntry: WorkerEntry, queueEntry: QueueEntry): void {
    workerEntry.busy = true;
    workerEntry.currentTaskId = queueEntry.task.taskId;

    this.pendingTasks.set(queueEntry.task.taskId, { ...queueEntry, workerEntry });

    // Set timeout
    const timer = setTimeout(() => {
      const pending = this.pendingTasks.get(queueEntry.task.taskId);
      if (pending) {
        this.pendingTasks.delete(queueEntry.task.taskId);
        pending.reject(new Error(`Sniffer timed out after ${queueEntry.task.timeoutMs}ms`));

        // Terminate the timed-out worker and replace it
        workerEntry.worker.terminate();
        const idx = this.workers.indexOf(workerEntry);
        if (idx !== -1 && !this.destroyed) {
          this.workers[idx] = this.createWorker();
          this.processQueue();
        }
      }
    }, queueEntry.task.timeoutMs);

    queueEntry.timer = timer;

    workerEntry.worker.postMessage(queueEntry.task);
  }

  /**
   * Submit a task to the pool. Returns a promise that resolves with the result.
   */
  runTask(
    snifferPath: string,
    fileContent: string,
    filePath: string,
    config: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<WorkerResultMessage> {
    if (this.destroyed) {
      return Promise.reject(new Error('Worker pool has been destroyed'));
    }

    const task: WorkerTask = {
      type: 'run-sniffer',
      taskId: randomUUID(),
      snifferPath,
      fileContent,
      filePath,
      config,
      timeoutMs,
    };

    return new Promise<WorkerResultMessage>((resolve, reject) => {
      const queueEntry: QueueEntry = { task, resolve, reject, timer: null };

      const idle = this.workers.find(w => !w.busy);
      if (idle) {
        this.assignTask(idle, queueEntry);
      } else {
        this.taskQueue.push(queueEntry);
      }
    });
  }

  /**
   * Shut down all workers and reject any pending tasks.
   */
  async destroy(): Promise<void> {
    this.destroyed = true;

    // Reject queued tasks
    for (const entry of this.taskQueue) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(new Error('Worker pool destroyed'));
    }
    this.taskQueue = [];

    // Reject pending tasks
    for (const [, entry] of this.pendingTasks) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(new Error('Worker pool destroyed'));
    }
    this.pendingTasks.clear();

    // Terminate all workers
    const terminatePromises = this.workers.map(({ worker }) =>
      worker.terminate().catch(() => {}),
    );
    await Promise.all(terminatePromises);
    this.workers = [];
  }
}
