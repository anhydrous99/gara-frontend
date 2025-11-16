/**
 * Observability module exports
 * Central point for all logging, metrics, and error handling
 */

// Initialization
export { initializeObservability } from './init'

// Logger
export { logger, createRequestLogger, Logger, BrowserLogger } from './logger'

// Metrics
export {
  metricsClient,
  trackOperation,
  CloudWatchMetricsClient,
  NoOpMetricsClient,
} from './metrics'

// Error handling
export {
  handleApiError,
  withErrorHandler,
  createContextualError,
  handleClientError,
  logReactError,
  registerGlobalErrorHandlers,
  ErrorSeverity,
} from './errorHandler'

export type { ErrorResponse } from './errorHandler'

// Configuration
export { observabilityConfig, loadConfig } from './config'

// Types
export type {
  ILogger,
  IMetricsClient,
  LogContext,
  RequestContext,
  Metric,
  MetricDimension,
  ObservabilityConfig,
} from './types'

export {
  LogLevel,
  MetricUnit,
  ContextualError,
} from './types'
