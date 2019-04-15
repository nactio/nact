export type ConsoleLoggingChannel = (message: string) => void

export interface ConsoleProxy {
  trace: ConsoleLoggingChannel
  debug: ConsoleLoggingChannel
  info: ConsoleLoggingChannel
  warn: ConsoleLoggingChannel
  critical: ConsoleLoggingChannel
  error: ConsoleLoggingChannel
}
