/**
 * API request context utilities
 * Provides access to request metadata and logging helpers
 */

import { NextRequest } from 'next/server'
import { logger, createRequestLogger, metricsClient } from '@/lib/observability'
import { ILogger, RequestContext } from '@/lib/observability/types'

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Extracts request ID from headers or generates a new one
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') ?? generateUUID()
}

/**
 * Extracts client IP address from request
 */
export function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ??
    request.headers.get('x-real-ip') ??
    undefined
  )
}

/**
 * Creates a request context object with all relevant metadata
 */
export function createRequestContext(request: NextRequest): RequestContext {
  const requestId = getRequestId(request)
  const url = new URL(request.url)

  return {
    requestId,
    method: request.method,
    url: url.pathname + url.search,
    userAgent: request.headers.get('user-agent') ?? undefined,
    ip: getClientIp(request),
  }
}

/**
 * Creates a logger instance scoped to the current request
 */
export function getRequestLogger(request: NextRequest): ILogger {
  const context = createRequestContext(request)
  return createRequestLogger(context.requestId, {
    method: context.method,
    url: context.url,
  })
}

/**
 * Logs request completion with timing and status
 */
export async function logRequest(
  request: NextRequest,
  statusCode: number,
  durationMs: number
): Promise<void> {
  const context = createRequestContext(request)
  const requestLogger = getRequestLogger(request)

  requestLogger.info('Request completed', {
    ...context,
    statusCode,
    duration: durationMs,
  })

  // Track metrics
  await metricsClient.trackDuration('ApiRequest', durationMs, [
    { name: 'Method', value: context.method },
    { name: 'StatusCode', value: String(statusCode) },
  ])

  await metricsClient.trackCount('ApiRequestCount', 1, [
    { name: 'Method', value: context.method },
    { name: 'StatusCode', value: String(statusCode) },
    { name: 'Success', value: statusCode < 400 ? 'true' : 'false' },
  ])
}

/**
 * Higher-order function to wrap API handlers with request logging
 * Automatically logs requests and tracks timing
 */
export function withRequestLogging<T>(
  handler: (request: NextRequest, logger: ILogger) => Promise<T>
): (request: NextRequest) => Promise<T> {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    const requestLogger = getRequestLogger(request)

    try {
      const result = await handler(request, requestLogger)
      const duration = Date.now() - startTime

      // Log successful request
      await logRequest(request, 200, duration)

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      // Log failed request
      await logRequest(request, 500, duration)

      throw error
    }
  }
}
