import pino from 'pino';

const LOG_BUFFER_MAX = 1000;

export interface LogEntry {
  time: string;
  level: string;
  msg: string;
  data?: Record<string, unknown>;
}

const logBuffer: LogEntry[] = [];

function pushToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) {
    logBuffer.shift();
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  hooks: {
    logMethod(inputArgs, method, level) {
      const levelLabel = logger.levels.labels[level] ?? 'info';
      const msg = typeof inputArgs[0] === 'string' ? inputArgs[0] : String(inputArgs[0] ?? '');
      const data =
        typeof inputArgs[0] === 'object' && inputArgs[0] !== null
          ? (inputArgs[0] as Record<string, unknown>)
          : inputArgs[1] && typeof inputArgs[1] === 'object'
            ? (inputArgs[1] as Record<string, unknown>)
            : undefined;

      pushToBuffer({
        time: new Date().toISOString(),
        level: levelLabel,
        msg: typeof inputArgs[0] === 'object' && inputArgs[1] ? String(inputArgs[1]) : msg,
        data,
      });

      return method.apply(this, inputArgs);
    },
  },
});

export function getRecentLogs(opts: {
  level?: string;
  search?: string;
  limit?: number;
}): LogEntry[] {
  const limit = Math.min(opts.limit ?? 100, 500);
  let entries = [...logBuffer];

  if (opts.level) {
    entries = entries.filter((e) => e.level === opts.level);
  }

  if (opts.search) {
    const search = opts.search.toLowerCase();
    entries = entries.filter((e) => e.msg.toLowerCase().includes(search));
  }

  return entries.slice(-limit).reverse();
}

export function countRecentErrors(windowMinutes: number): number {
  const cutoff = Date.now() - windowMinutes * 60 * 1000;
  return logBuffer.filter((e) => {
    if (e.level !== 'error' && e.level !== 'fatal') {
      return false;
    }
    return new Date(e.time).getTime() >= cutoff;
  }).length;
}

export function __clearLogBufferForTests(): void {
  logBuffer.length = 0;
}

export function __pushLogForTests(entry: LogEntry): void {
  pushToBuffer(entry);
}
