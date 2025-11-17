/**
 * Type definitions for observability infrastructure
 * Provides type safety for logging, metrics, and monitoring
 */

/**
 * Log levels following RFC 5424 severity levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Context data that can be attached to any log entry
 */
export interface LogContext {
  requestId?: string
  userId?: string
  sessionId?: string
  operation?: string
  duration?: number
  [key: string]: unknown
}

/**
 * Structured log entry format
 */
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * Logger interface - allows for dependency injection and testing
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, error?: Error, context?: LogContext): void
  fatal(message: string, error?: Error, context?: LogContext): void
  child(context: LogContext): ILogger
}

/**
 * Standard metric unit types
 */
export enum MetricUnit {
  SECONDS = 'Seconds',
  MICROSECONDS = 'Microseconds',
  MILLISECONDS = 'Milliseconds',
  BYTES = 'Bytes',
  KILOBYTES = 'Kilobytes',
  MEGABYTES = 'Megabytes',
  GIGABYTES = 'Gigabytes',
  TERABYTES = 'Terabytes',
  BITS = 'Bits',
  KILOBITS = 'Kilobits',
  MEGABITS = 'Megabits',
  GIGABITS = 'Gigabits',
  TERABITS = 'Terabits',
  PERCENT = 'Percent',
  COUNT = 'Count',
  BYTES_PER_SECOND = 'Bytes/Second',
  KILOBYTES_PER_SECOND = 'Kilobytes/Second',
  MEGABYTES_PER_SECOND = 'Megabytes/Second',
  GIGABYTES_PER_SECOND = 'Gigabytes/Second',
  TERABYTES_PER_SECOND = 'Terabytes/Second',
  BITS_PER_SECOND = 'Bits/Second',
  KILOBITS_PER_SECOND = 'Kilobits/Second',
  MEGABITS_PER_SECOND = 'Megabits/Second',
  GIGABITS_PER_SECOND = 'Gigabits/Second',
  TERABITS_PER_SECOND = 'Terabits/Second',
  COUNT_PER_SECOND = 'Count/Second',
  NONE = 'None',
}

/**
 * Dimension for categorizing metrics
 */
export interface MetricDimension {
  name: string
  value: string
}

/**
 * Metric data point
 */
export interface Metric {
  name: string
  value: number
  unit: MetricUnit
  dimensions?: MetricDimension[]
  timestamp?: Date
}

/**
 * Metrics client interface - allows for dependency injection and testing
 */
export interface IMetricsClient {
  putMetric(metric: Metric): Promise<void>
  trackDuration(name: string, durationMs: number, dimensions?: MetricDimension[]): Promise<void>
  trackCount(name: string, count: number, dimensions?: MetricDimension[]): Promise<void>
  trackError(operation: string, error: Error): Promise<void>
}

/**
 * Configuration for observability features
 */
export interface ObservabilityConfig {
  logLevel: LogLevel
  enableMetrics: boolean
  enableRequestLogging: boolean
  metricsBackend: 'console' | 'file' | string
}

/**
 * HTTP request context for logging
 */
export interface RequestContext extends LogContext {
  requestId: string  // Override to make required - always present in requests
  method: string
  url: string
  statusCode?: number
  userAgent?: string
  ip?: string
}

/**
 * Error with additional context
 */
export class ContextualError extends Error {
  constructor(
    message: string,
    public readonly context: LogContext,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ContextualError'
    if (originalError?.stack) {
      this.stack = originalError.stack
    }
  }
}
