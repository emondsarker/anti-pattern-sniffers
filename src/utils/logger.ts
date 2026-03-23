export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

let currentLevel: LogLevel = 'info';

// ANSI color codes
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const MAGENTA = '\x1b[35m';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function timestamp(): string {
  const now = new Date();
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  return `${DIM}${h}:${m}:${s}.${ms}${RESET}`;
}

export function debug(...args: unknown[]): void {
  if (shouldLog('debug')) {
    console.error(`${timestamp()} ${DIM}DBG${RESET}`, ...args);
  }
}

export function info(...args: unknown[]): void {
  if (shouldLog('info')) {
    console.error(`${timestamp()} ${CYAN}${BOLD}INF${RESET}`, ...args);
  }
}

export function warn(...args: unknown[]): void {
  if (shouldLog('warn')) {
    console.error(`${timestamp()} ${YELLOW}${BOLD}WRN${RESET}`, ...args);
  }
}

export function error(...args: unknown[]): void {
  if (shouldLog('error')) {
    console.error(`${timestamp()} ${RED}${BOLD}ERR${RESET}`, ...args);
  }
}

// TUI-specific helpers for progress display

export function step(label: string): void {
  if (shouldLog('info')) {
    console.error(`${timestamp()} ${MAGENTA}${BOLD}>>>${RESET} ${label}`);
  }
}

export function success(label: string): void {
  if (shouldLog('info')) {
    console.error(`${timestamp()} ${GREEN}${BOLD} ✔ ${RESET} ${label}`);
  }
}

export function fileProgress(current: number, total: number, filePath: string): void {
  if (shouldLog('debug')) {
    const pct = Math.round((current / total) * 100);
    const bar = progressBar(pct);
    console.error(`${timestamp()} ${DIM}${bar} [${current}/${total}]${RESET} ${DIM}${filePath}${RESET}`);
  }
}

function progressBar(pct: number): string {
  const width = 20;
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `${GREEN}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
}
