/**
 * Centralized error handling utilities
 * Provides consistent error logging and response formatting
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'
import { metricsClient } from './metrics'
import { LogContext, ContextualError } from './types'

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string
  message?: string
  details?: unknown
}

/**
 * Error severity levels for categorization
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Maps HTTP status codes to error severity
 */
function getErrorSeverity(statusCode: number): ErrorSeverity {
  if (statusCode >= 500) return ErrorSeverity.CRITICAL
  if (statusCode >= 400) return ErrorSeverity.MEDIUM
  return ErrorSeverity.LOW
}

/**
 * Determines if an error should be exposed to the client
 */
function shouldExposeError(statusCode: number): boolean {
  // Only expose client errors (4xx), hide server errors (5xx)
  return statusCode >= 400 && statusCode < 500
}

/**
 * Extracts meaningful error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return 'An unknown error occurred'
}

/**
 * Creates a user-friendly error response
 * Hides sensitive information for server errors
 */
export function createErrorResponse(
  error: unknown,
  statusCode: number,
  userMessage?: string
): ErrorResponse {
  const shouldExpose = shouldExposeError(statusCode)
  const errorMessage = extractErrorMessage(error)

  return {
    error: userMessage ?? (shouldExpose ? errorMessage : 'Internal server error'),
    message: shouldExpose ? errorMessage : undefined,
    details: process.env.NODE_ENV === 'development' && error instanceof Error
      ? {
          name: error.name,
          stack: error.stack,
        }
      : undefined,
  }
}

/**
 * Handles API route errors with logging and metrics
 *
 * @param error - The error that occurred
 * @param context - Additional context for logging
 * @param statusCode - HTTP status code (default: 500)
 * @param userMessage - Optional user-friendly message
 * @returns NextResponse with error details
 */
export async function handleApiError(
  error: unknown,
  context: LogContext,
  statusCode: number = 500,
  userMessage?: string
): Promise<NextResponse<ErrorResponse>> {
  const errorInstance = error instanceof Error
    ? error
    : new Error(extractErrorMessage(error))

  const severity = getErrorSeverity(statusCode)
  const operation = context.operation ?? 'unknown_operation'

  // Log error with full context
  logger.error(`API error in ${operation}`, errorInstance, {
    ...context,
    statusCode,
    severity,
  })

  // Track error metrics
  await metricsClient.trackError(operation, errorInstance)
  await metricsClient.trackCount('ApiErrors', 1, [
    { name: 'Operation', value: operation },
    { name: 'StatusCode', value: String(statusCode) },
    { name: 'Severity', value: severity },
  ])

  // Create response
  const errorResponse = createErrorResponse(error, statusCode, userMessage)

  return NextResponse.json(errorResponse, { status: statusCode })
}

/**
 * Wraps an API route handler with error handling
 * Follows Decorator pattern for clean integration
 *
 * @param handler - The API route handler function
 * @param operation - Name of the operation for logging
 * @returns Wrapped handler with error handling
 */
export function withErrorHandler<T>(
  handler: (context: LogContext) => Promise<NextResponse<T>>,
  operation: string
): (context: LogContext) => Promise<NextResponse<T | ErrorResponse>> {
  return async (context: LogContext) => {
    try {
      return await handler(context)
    } catch (error) {
      return handleApiError(error, { ...context, operation })
    }
  }
}

/**
 * Creates a contextual error with additional metadata
 * Useful for adding context as error propagates up the call stack
 */
export function createContextualError(
  message: string,
  context: LogContext,
  originalError?: Error
): ContextualError {
  return new ContextualError(message, context, originalError)
}

/**
 * Handles client-side errors (browser)
 * Logs to console in structured format
 */
export function handleClientError(
  error: unknown,
  context: LogContext
): void {
  const errorInstance = error instanceof Error
    ? error
    : new Error(extractErrorMessage(error))

  logger.error('Client error occurred', errorInstance, context)
}

/**
 * Global error boundary handler for React
 * Can be used with Error Boundary components
 */
export function logReactError(
  error: Error,
  errorInfo: { componentStack: string }
): void {
  logger.error('React error boundary caught error', error, {
    componentStack: errorInfo.componentStack,
  })

  metricsClient.trackError('ReactErrorBoundary', error)
}

/**
 * Handles promise rejections
 * Should be registered globally
 */
export function handleUnhandledRejection(
  reason: unknown,
  promise: Promise<unknown>
): void {
  const error = reason instanceof Error
    ? reason
    : new Error(String(reason))

  logger.error('Unhandled promise rejection', error, {
    promiseDetails: String(promise),
  })

  metricsClient.trackError('UnhandledRejection', error)
}

/**
 * Handles uncaught exceptions
 * Should be registered globally
 */
export function handleUncaughtException(error: Error): void {
  logger.fatal('Uncaught exception', error)
  metricsClient.trackError('UncaughtException', error)

  // Give time for logs to flush before exiting
  setTimeout(() => {
    process.exit(1)
  }, 1000)
}

/**
 * Register global error handlers
 * Call this once at application startup (server-side only)
 */
export function registerGlobalErrorHandlers(): void {
  if (typeof process === 'undefined') {
    return // Browser environment
  }

  process.on('unhandledRejection', handleUnhandledRejection)
  process.on('uncaughtException', handleUncaughtException)

  logger.info('Global error handlers registered')
}
