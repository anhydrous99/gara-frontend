/**
 * CloudWatch metrics client implementation
 * Follows Single Responsibility and Dependency Inversion principles
 */

import {
  CloudWatchClient,
  PutMetricDataCommand,
  PutMetricDataCommandInput,
} from '@aws-sdk/client-cloudwatch'
import { IMetricsClient, Metric, MetricDimension, MetricUnit } from './types'
import { observabilityConfig } from './config'
import { logger } from './logger'

/**
 * CloudWatch metrics client implementation
 * Batches metrics and handles errors gracefully
 */
export class CloudWatchMetricsClient implements IMetricsClient {
  private readonly client: CloudWatchClient
  private readonly namespace: string
  private readonly enabled: boolean
  private metricsBuffer: Metric[] = []
  private flushTimer: NodeJS.Timeout | null = null

  private static readonly BUFFER_SIZE = 20 // CloudWatch max metrics per request
  private static readonly FLUSH_INTERVAL_MS = 60000 // 1 minute

  constructor(
    namespace?: string,
    region?: string,
    enabled?: boolean
  ) {
    this.namespace = namespace ?? observabilityConfig.cloudWatch?.namespace ?? 'GaraFrontend'
    this.enabled = enabled ?? observabilityConfig.cloudWatch?.enabled ?? false

    this.client = new CloudWatchClient({
      region: region ?? observabilityConfig.cloudWatch?.region ?? 'us-east-1',
    })

    // Start periodic flush
    if (this.enabled) {
      this.startPeriodicFlush()
    }
  }

  /**
   * Publishes a single metric to CloudWatch
   * Buffers metrics and flushes when buffer is full
   */
  async putMetric(metric: Metric): Promise<void> {
    if (!this.enabled) {
      logger.debug('Metrics disabled, skipping metric', { metric: metric.name })
      return
    }

    this.metricsBuffer.push(metric)

    if (this.metricsBuffer.length >= CloudWatchMetricsClient.BUFFER_SIZE) {
      await this.flush()
    }
  }

  /**
   * Tracks operation duration in milliseconds
   */
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

  /**
   * Tracks a count metric (e.g., requests, errors)
   */
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

  /**
   * Tracks error occurrences with automatic categorization
   */
  async trackError(operation: string, error: Error): Promise<void> {
    await this.trackCount('Errors', 1, [
      { name: 'Operation', value: operation },
      { name: 'ErrorType', value: error.name },
    ])
  }

  /**
   * Flushes buffered metrics to CloudWatch
   */
  private async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return
    }

    const metricsToFlush = [...this.metricsBuffer]
    this.metricsBuffer = []

    try {
      const input: PutMetricDataCommandInput = {
        Namespace: this.namespace,
        MetricData: metricsToFlush.map((metric) => ({
          MetricName: metric.name,
          Value: metric.value,
          Unit: metric.unit,
          Timestamp: metric.timestamp ?? new Date(),
          Dimensions: metric.dimensions?.map((dim) => ({
            Name: dim.name,
            Value: dim.value,
          })),
        })),
      }

      const command = new PutMetricDataCommand(input)
      await this.client.send(command)

      logger.debug('Flushed metrics to CloudWatch', {
        count: metricsToFlush.length,
        namespace: this.namespace,
      })
    } catch (error) {
      logger.error('Failed to flush metrics to CloudWatch', error as Error, {
        metricsCount: metricsToFlush.length,
      })

      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush)
    }
  }

  /**
   * Starts periodic flush timer
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        logger.error('Periodic metrics flush failed', error as Error)
      })
    }, CloudWatchMetricsClient.FLUSH_INTERVAL_MS)

    // Prevent timer from keeping process alive
    this.flushTimer.unref()
  }

  /**
   * Gracefully shutdown metrics client
   * Flushes remaining metrics
   */
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

  // Server-side - use CloudWatch if enabled
  if (observabilityConfig.cloudWatch?.enabled) {
    return new CloudWatchMetricsClient()
  }

  return new NoOpMetricsClient()
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
    if (metricsClient instanceof CloudWatchMetricsClient) {
      await metricsClient.shutdown()
    }
  }

  process.on('SIGTERM', shutdownHandler)
  process.on('SIGINT', shutdownHandler)
}
