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
  CLOUDWATCH_NAMESPACE: 'CLOUDWATCH_NAMESPACE',
  AWS_REGION: 'AWS_REGION',
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
 * Validates required environment variables for CloudWatch
 */
function validateCloudWatchConfig(): boolean {
  const namespace = process.env[ENV_KEYS.CLOUDWATCH_NAMESPACE]
  const region = process.env[ENV_KEYS.AWS_REGION]

  if (!namespace || !region) {
    console.warn(
      'CloudWatch metrics disabled: CLOUDWATCH_NAMESPACE and AWS_REGION must be set'
    )
    return false
  }

  return true
}

/**
 * Loads and validates observability configuration from environment
 *
 * @returns Validated observability configuration
 * @throws Never throws - returns safe defaults on invalid config
 */
export function loadConfig(): ObservabilityConfig {
  const logLevel = parseLogLevel(process.env[ENV_KEYS.LOG_LEVEL])
  const enableMetrics = parseBoolean(process.env[ENV_KEYS.ENABLE_METRICS], true)
  const enableRequestLogging = parseBoolean(
    process.env[ENV_KEYS.ENABLE_REQUEST_LOGGING],
    true
  )

  const cloudWatchEnabled = enableMetrics && validateCloudWatchConfig()

  const config: ObservabilityConfig = {
    logLevel,
    enableMetrics,
    enableRequestLogging,
    cloudWatch: {
      namespace: process.env[ENV_KEYS.CLOUDWATCH_NAMESPACE] || 'GaraFrontend',
      region: process.env[ENV_KEYS.AWS_REGION] || 'us-east-1',
      enabled: cloudWatchEnabled,
    },
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
