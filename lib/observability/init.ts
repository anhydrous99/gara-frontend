/**
 * Observability initialization
 * Call this once at application startup (server-side only)
 */

import { registerGlobalErrorHandlers } from './errorHandler'
import { logger } from './logger'
import { observabilityConfig } from './config'

let initialized = false

/**
 * Initializes observability infrastructure
 * - Registers global error handlers
 * - Logs initialization details
 * - Safe to call multiple times (idempotent)
 */
export function initializeObservability(): void {
  if (initialized) {
    return
  }

  if (typeof window !== 'undefined') {
    // Skip initialization in browser
    return
  }

  try {
    // Register global error handlers
    registerGlobalErrorHandlers()

    // Log initialization
    logger.info('Observability initialized', {
      logLevel: observabilityConfig.logLevel,
      metricsEnabled: observabilityConfig.enableMetrics,
      requestLoggingEnabled: observabilityConfig.enableRequestLogging,
      metricsBackend: observabilityConfig.metricsBackend,
      nodeEnv: process.env.NODE_ENV,
    })

    initialized = true
  } catch (error) {
    console.error('Failed to initialize observability:', error)
    // Don't throw - allow app to continue even if observability fails
  }
}

// Auto-initialize when module is imported (server-side only)
if (typeof window === 'undefined') {
  initializeObservability()
}
