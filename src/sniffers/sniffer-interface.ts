export type Severity = 'info' | 'warning' | 'error';
export type SnifferCategory = 'props' | 'hooks' | 'architecture' | 'custom';

export interface Detection {
  snifferName: string;
  filePath: string;
  line: number;
  column: number;
  message: string;
  severity: Severity;
  suggestion: string;
  details?: Record<string, unknown>;
}

export interface SnifferMeta {
  name: string;
  description: string;
  category: SnifferCategory;
  severity: Severity;
  defaultConfig: Record<string, unknown>;
}

export interface SnifferExport {
  name: string;
  description: string;
  meta: SnifferMeta;
  detect(fileContent: string, filePath: string, config: Record<string, unknown>): Detection[];
}

export interface SnifferResult {
  snifferName: string;
  filePath: string;
  detections: Detection[];
  durationMs: number;
  error: string | null;
}

export interface SnifferConfig {
  include: string[];
  exclude: string[];
  parallel: boolean;
  maxWorkers: number;
  timeoutMs: number;
  outputFormat: 'markdown' | 'json';
  outputPath: string | null;
  sniffers: Record<string, Record<string, unknown>>;
  plugins: PluginEntry[];
}

export interface PluginEntry {
  path: string;
  config?: Record<string, unknown>;
}

export interface SnifferEntry {
  name: string;
  snifferPath: string;
  config: Record<string, unknown>;
}

// Worker message protocol
export interface WorkerTask {
  type: 'run-sniffer';
  taskId: string;
  snifferPath: string;
  fileContent: string;
  filePath: string;
  config: Record<string, unknown>;
  timeoutMs: number;
}

export interface WorkerResultMessage {
  type: 'sniffer-result';
  taskId: string;
  result: SnifferResult;
}

export interface WorkerErrorMessage {
  type: 'sniffer-error';
  taskId: string;
  error: string;
}

export type WorkerMessage = WorkerResultMessage | WorkerErrorMessage | { type: 'shutdown' };

// Validation schema for plugin exports
export const REQUIRED_EXPORT_SCHEMA = {
  name: 'string',
  description: 'string',
  meta: 'object',
  detect: 'function',
} as const;

export const REQUIRED_META_SCHEMA = {
  name: 'string',
  description: 'string',
  category: 'string',
  severity: 'string',
  defaultConfig: 'object',
} as const;
