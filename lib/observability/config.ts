/**
 * Observability configuration management
 * Follows Single Responsibility Principle: handles only configuration
 */

import { LogLevel, ObservabilityConfig } from './types'

/**
 * Environment variable keys
 */
const ENV_KEYS = {
  LOG_LEVEL: 'LOG_LEVEL',
  ENABLE_METRICS: 'ENABLE_METRICS',
  ENABLE_REQUEST_LOGGING: 'ENABLE_REQUEST_LOGGING',
  METRICS_BACKEND: 'METRICS_BACKEND',
  NODE_ENV: 'NODE_ENV',
} as const

/**
 * Validates and parses log level from environment
 */
function parseLogLevel(value: string | undefined): LogLevel {
  const validLevels = Object.values(LogLevel)
  const level = value?.toLowerCase()

  if (level && validLevels.includes(level as LogLevel)) {
    return level as LogLevel
  }

  // Default log level based on environment
  const nodeEnv = process.env[ENV_KEYS.NODE_ENV]
  return nodeEnv === 'production' ? LogLevel.INFO : LogLevel.DEBUG
}

/**
 * Parses boolean from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue
  }
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Loads and validates observability configuration from environment
 *
 * @returns Validated observability configuration
 * @throws Never throws - returns safe defaults on invalid config
 */
export function loadConfig(): ObservabilityConfig {
  const logLevel = parseLogLevel(process.env[ENV_KEYS.LOG_LEVEL])
  const enableMetrics = parseBoolean(process.env[ENV_KEYS.ENABLE_METRICS], false)
  const enableRequestLogging = parseBoolean(
    process.env[ENV_KEYS.ENABLE_REQUEST_LOGGING],
    true
  )
  const metricsBackend = process.env[ENV_KEYS.METRICS_BACKEND] || 'console'

  const config: ObservabilityConfig = {
    logLevel,
    enableMetrics,
    enableRequestLogging,
    metricsBackend,
  }

  return config
}

/**
 * Singleton instance of configuration
 * Initialized once on module load
 */
export const observabilityConfig = loadConfig()

/**
 * Type-safe environment variable accessor
 */
export function getEnv(key: keyof typeof ENV_KEYS): string | undefined {
  return process.env[ENV_KEYS[key]]
}
