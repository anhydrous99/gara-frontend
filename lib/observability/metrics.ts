/**
 * Metrics client implementation with multiple backends
 * Follows Single Responsibility and Dependency Inversion principles
 */

import { IMetricsClient, Metric, MetricDimension, MetricUnit } from './types'
import { observabilityConfig } from './config'
import { logger } from './logger'

/**
 * Console metrics client implementation
 * Logs metrics to stdout for local development
 */
export class ConsoleMetricsClient implements IMetricsClient {
  private readonly namespace: string
  private readonly enabled: boolean

  constructor(namespace?: string, enabled?: boolean) {
    this.namespace = namespace ?? 'GaraFrontend'
    this.enabled = enabled ?? true
  }

  async putMetric(metric: Metric): Promise<void> {
    if (!this.enabled) {
      return
    }

    const dimensions = metric.dimensions
      ?.map((dim) => `${dim.name}=${dim.value}`)
      .join(', ')

    logger.debug('Metric recorded', {
      namespace: this.namespace,
      metric: metric.name,
      value: metric.value,
      unit: metric.unit,
      dimensions: dimensions || 'none',
    })
  }

  async trackDuration(
    name: string,
    durationMs: number,
    dimensions?: MetricDimension[]
  ): Promise<void> {
    await this.putMetric({
      name,
      value: durationMs,
      unit: MetricUnit.MILLISECONDS,
      dimensions,
      timestamp: new Date(),
    })
  }

  async trackCount(
    name: string,
    count: number,
    dimensions?: MetricDimension[]
  ): Promise<void> {
    await this.putMetric({
      name,
      value: count,
      unit: MetricUnit.COUNT,
      dimensions,
      timestamp: new Date(),
    })
  }

  async trackError(operation: string, error: Error): Promise<void> {
    await this.trackCount('Errors', 1, [
      { name: 'Operation', value: operation },
      { name: 'ErrorType', value: error.name },
    ])
  }
}

/**
 * File-based metrics client implementation
 * Writes metrics to a JSON file for local development
 */
export class FileMetricsClient implements IMetricsClient {
  private readonly namespace: string
  private readonly enabled: boolean
  private metricsBuffer: Metric[] = []
  private flushTimer: NodeJS.Timeout | null = null

  private static readonly BUFFER_SIZE = 100
  private static readonly FLUSH_INTERVAL_MS = 60000 // 1 minute

  constructor(namespace?: string, enabled?: boolean) {
    this.namespace = namespace ?? 'GaraFrontend'
    this.enabled = enabled ?? true

    if (this.enabled) {
      this.startPeriodicFlush()
    }
  }

  async putMetric(metric: Metric): Promise<void> {
    if (!this.enabled) {
      return
    }

    this.metricsBuffer.push(metric)

    if (this.metricsBuffer.length >= FileMetricsClient.BUFFER_SIZE) {
      await this.flush()
    }
  }

  async trackDuration(
    name: string,
    durationMs: number,
    dimensions?: MetricDimension[]
  ): Promise<void> {
    await this.putMetric({
      name,
      value: durationMs,
      unit: MetricUnit.MILLISECONDS,
      dimensions,
      timestamp: new Date(),
    })
  }

  async trackCount(
    name: string,
    count: number,
    dimensions?: MetricDimension[]
  ): Promise<void> {
    await this.putMetric({
      name,
      value: count,
      unit: MetricUnit.COUNT,
      dimensions,
      timestamp: new Date(),
    })
  }

  async trackError(operation: string, error: Error): Promise<void> {
    await this.trackCount('Errors', 1, [
      { name: 'Operation', value: operation },
      { name: 'ErrorType', value: error.name },
    ])
  }

  private async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return
    }

    const metricsToFlush = [...this.metricsBuffer]
    this.metricsBuffer = []

    try {
      const fs = await import('fs/promises')
      const path = await import('path')

      const metricsDir = path.join(process.cwd(), 'logs')
      const metricsFile = path.join(metricsDir, 'metrics.jsonl')

      // Ensure logs directory exists
      try {
        await fs.mkdir(metricsDir, { recursive: true })
      } catch {
        // Directory might already exist
      }

      // Append metrics to file as newline-delimited JSON
      const lines = metricsToFlush.map((metric) =>
        JSON.stringify({
          namespace: this.namespace,
          timestamp: metric.timestamp?.toISOString() || new Date().toISOString(),
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          dimensions: metric.dimensions,
        })
      )

      await fs.appendFile(metricsFile, lines.join('\n') + '\n')

      logger.debug('Flushed metrics to file', {
        count: metricsToFlush.length,
        file: metricsFile,
      })
    } catch (error) {
      logger.error('Failed to flush metrics to file', error as Error, {
        metricsCount: metricsToFlush.length,
      })

      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush)
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        logger.error('Periodic metrics flush failed', error as Error)
      })
    }, FileMetricsClient.FLUSH_INTERVAL_MS)

    // Prevent timer from keeping process alive
    this.flushTimer.unref()
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    await this.flush()
    logger.info('Metrics client shutdown complete')
  }
}

/**
 * No-op metrics client for when metrics are disabled
 * Follows Null Object pattern
 */
export class NoOpMetricsClient implements IMetricsClient {
  async putMetric(): Promise<void> {
    // No-op
  }

  async trackDuration(): Promise<void> {
    // No-op
  }

  async trackCount(): Promise<void> {
    // No-op
  }

  async trackError(): Promise<void> {
    // No-op
  }
}

/**
 * Factory function to create appropriate metrics client
 */
function createMetricsClient(): IMetricsClient {
  // Browser environment - no metrics
  if (typeof window !== 'undefined') {
    return new NoOpMetricsClient()
  }

  // Check if metrics are enabled
  const metricsEnabled = observabilityConfig.cloudWatch?.enabled ?? false

  if (!metricsEnabled) {
    return new NoOpMetricsClient()
  }

  // Determine backend type from environment variable
  const metricsBackend = process.env.METRICS_BACKEND || 'console'

  switch (metricsBackend) {
    case 'console':
      return new ConsoleMetricsClient()
    case 'file':
      return new FileMetricsClient()
    default:
      logger.warn('Unknown metrics backend, using NoOp client', {
        backend: metricsBackend,
      })
      return new NoOpMetricsClient()
  }
}

/**
 * Singleton metrics client instance
 */
export const metricsClient = createMetricsClient()

/**
 * Utility function to time async operations and track duration
 */
export async function trackOperation<T>(
  name: string,
  operation: () => Promise<T>,
  dimensions?: MetricDimension[]
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await operation()
    const duration = Date.now() - startTime

    await metricsClient.trackDuration(name, duration, dimensions)
    await metricsClient.trackCount(`${name}.Success`, 1, dimensions)

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    await metricsClient.trackDuration(name, duration, dimensions)
    await metricsClient.trackCount(`${name}.Failure`, 1, dimensions)
    await metricsClient.trackError(name, error as Error)

    throw error
  }
}

/**
 * Handle graceful shutdown of metrics
 */
if (typeof process !== 'undefined') {
  const shutdownHandler = async () => {
    if (metricsClient instanceof FileMetricsClient) {
      await metricsClient.shutdown()
    }
  }

  process.on('SIGTERM', shutdownHandler)
  process.on('SIGINT', shutdownHandler)
}
