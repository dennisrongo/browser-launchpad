/**
 * Simple logger utility for consistent error logging across the application
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: any
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 100 // Keep only the last 100 logs in memory

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private addLog(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: this.formatTimestamp(),
      data,
    }

    // Add to logs array
    this.logs.push(entry)

    // Keep only the last maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Also log to console for development
    if (import.meta.env.DEV) {
      const logMethod = level === 'error' ? console.error :
                        level === 'warn' ? console.warn :
                        level === 'debug' ? console.debug :
                        console.log

      if (data) {
        logMethod(`[${level.toUpperCase()}] ${message}`, data)
      } else {
        logMethod(`[${level.toUpperCase()}] ${message}`)
      }
    }
  }

  info(message: string, data?: any): void {
    this.addLog('info', message, data)
  }

  warn(message: string, data?: any): void {
    this.addLog('warn', message, data)
  }

  error(message: string, data?: any): void {
    this.addLog('error', message, data)
  }

  debug(message: string, data?: any): void {
    this.addLog('debug', message, data)
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
