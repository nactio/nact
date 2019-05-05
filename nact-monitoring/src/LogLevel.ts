export enum LogLevel {
  OFF = 0,
  TRACE = 1,
  DEBUG = 2,
  INFO = 3,
  WARN = 4,
  ERROR = 5,
  CRITICAL = 6,
}

export function logLevelToString(level: LogLevel): string {
  return LogLevel[level]
}
