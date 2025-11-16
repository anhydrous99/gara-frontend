/**
 * Structured logging implementation using Pino
 * Follows Single Responsibility and Dependency Inversion principles
 */

import pino from 'pino'
import { ILogger, LogContext, LogLevel } from './types'
import { observabilityConfig } from './config'

/**
 * Creates a Pino logger instance configured for ECS/CloudWatch
 *
 * Configuration:
 * - JSON output to stdout (captured by ECS awslogs driver)
 * - Timestamp in ISO format
 * - Pretty printing in development
 * - Redaction of sensitive fields
 */
function createPinoLogger() {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return pino({
    level: observabilityConfig.logLevel,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    // Redact sensitive information
    redact: {
      paths: [
        'password',
        'token',
        'apiKey',
        'secret',
        'authorization',
        'cookie',
        '*.password',
        '*.token',
        '*.apiKey',
        '*.secret',
      ],
      remove: true,
    },
    // Pretty print in development for better DX
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  })
}

/**
 * Logger implementation wrapping Pino
 * Implements ILogger interface for testability
 */
export class Logger implements ILogger {
  constructor(private readonly pinoInstance: pino.Logger) {}

  /**
   * Creates a child logger with additional context
   * Useful for request-scoped logging
   */
  child(context: LogContext): ILogger {
    return new Logger(this.pinoInstance.child(context))
  }

  debug(message: string, context?: LogContext): void {
    this.pinoInstance.debug(context ?? {}, message)
  }

  info(message: string, context?: LogContext): void {
    this.pinoInstance.info(context ?? {}, message)
  }

  warn(message: string, context?: LogContext): void {
    this.pinoInstance.warn(context ?? {}, message)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const logData = {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    }
    this.pinoInstance.error(logData, message)
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    const logData = {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    }
    this.pinoInstance.fatal(logData, message)
  }
}

/**
 * Browser-safe logger for client-side code
 * Falls back to console when Pino is not available
 */
export class BrowserLogger implements ILogger {
  constructor(private readonly context: LogContext = {}) {}

  child(context: LogContext): ILogger {
    return new BrowserLogger({ ...this.context, ...context })
  }

  private log(level: LogLevel, message: string, additionalContext?: LogContext) {
    const logEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...this.context,
      ...additionalContext,
    }

    // Use appropriate console method
    const consoleMethod = level === LogLevel.DEBUG || level === LogLevel.INFO
      ? console.log
      : level === LogLevel.WARN
      ? console.warn
      : console.error

    consoleMethod(JSON.stringify(logEntry))
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    })
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    })
  }
}

/**
 * Factory function to create appropriate logger based on environment
 */
function createLogger(): ILogger {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return new BrowserLogger()
  }

  // Server-side: use Pino
  return new Logger(createPinoLogger())
}

/**
 * Singleton logger instance
 * Use this throughout the application
 */
export const logger = createLogger()

/**
 * Utility function to create request-scoped logger
 * Automatically includes requestId and other context
 */
export function createRequestLogger(requestId: string, additionalContext?: LogContext): ILogger {
  return logger.child({
    requestId,
    ...additionalContext,
  })
}
