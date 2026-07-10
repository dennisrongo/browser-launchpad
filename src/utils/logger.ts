/**
 * Simple logger utility for consistent error logging across the application
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: unknown[]
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 100 // Keep only the last 100 logs in memory

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private addLog(level: LogLevel, args: unknown[]): void {
    const [first, ...rest] = args
    const message = typeof first === 'string' ? first : String(first)

    const entry: LogEntry = {
      level,
      message,
      timestamp: this.formatTimestamp(),
      data: rest.length > 0 ? rest : undefined,
    }

    // Add to logs array
    this.logs.push(entry)

    // Keep only the last maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Also log to console for development. Production stays quiet by design;
    // recent entries remain retrievable via getLogs() for diagnostics.
    if (import.meta.env.DEV) {
      const logMethod = level === 'error' ? console.error :
                        level === 'warn' ? console.warn :
                        level === 'debug' ? console.debug :
                        console.log

      logMethod(`[${level.toUpperCase()}]`, ...args)
    }
  }

  info(...args: unknown[]): void {
    this.addLog('info', args)
  }

  warn(...args: unknown[]): void {
    this.addLog('warn', args)
  }

  error(...args: unknown[]): void {
    this.addLog('error', args)
  }

  debug(...args: unknown[]): void {
    this.addLog('debug', args)
  }

  /**
   * Get all logs (useful for debugging/exporting)
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }
}

// Export singleton instance
export const logger = new Logger()
