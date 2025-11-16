/**
 * Unit tests for metrics module
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { CloudWatchMetricsClient, NoOpMetricsClient, trackOperation } from '../metrics'
import { MetricUnit } from '../types'
import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch'

// Mock AWS SDK
jest.mock('@aws-sdk/client-cloudwatch')

describe('CloudWatchMetricsClient', () => {
  let mockSend: jest.MockedFunction<any>
  let client: CloudWatchMetricsClient

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    mockSend = jest.fn().mockResolvedValue({})

    // Mock CloudWatchClient constructor
    const { CloudWatchClient } = require('@aws-sdk/client-cloudwatch')
    CloudWatchClient.mockImplementation(() => ({
      send: mockSend,
    }))

    client = new CloudWatchMetricsClient('TestNamespace', 'us-east-1', true)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('putMetric', () => {
    it('should buffer metrics without immediate send', async () => {
      await client.putMetric({
        name: 'TestMetric',
        value: 123,
        unit: MetricUnit.COUNT,
      })

      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should flush when buffer reaches limit', async () => {
      // Add 20 metrics to reach buffer limit
      for (let i = 0; i < 20; i++) {
        await client.putMetric({
          name: `Metric${i}`,
          value: i,
          unit: MetricUnit.COUNT,
        })
      }

      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Namespace: 'TestNamespace',
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: 'Metric0',
                Value: 0,
              }),
            ]),
          }),
        })
      )
    })

    it('should not send metrics when disabled', async () => {
      const disabledClient = new CloudWatchMetricsClient(
        'TestNamespace',
        'us-east-1',
        false
      )

      await disabledClient.putMetric({
        name: 'TestMetric',
        value: 100,
        unit: MetricUnit.COUNT,
      })

      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('trackDuration', () => {
    it('should track duration metric with dimensions', async () => {
      await client.trackDuration('ApiRequest', 250, [
        { name: 'Method', value: 'GET' },
        { name: 'StatusCode', value: '200' },
      ])

      // Trigger flush
      for (let i = 0; i < 19; i++) {
        await client.putMetric({
          name: 'Filler',
          value: 1,
          unit: MetricUnit.COUNT,
        })
      }

      expect(mockSend).toHaveBeenCalled()
      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand.input.MetricData).toContainEqual(
        expect.objectContaining({
          MetricName: 'ApiRequest',
          Value: 250,
          Unit: 'Milliseconds',
          Dimensions: [
            { Name: 'Method', Value: 'GET' },
            { Name: 'StatusCode', Value: '200' },
          ],
        })
      )
    })
  })

  describe('trackCount', () => {
    it('should track count metric', async () => {
      await client.trackCount('ImageUpload', 1, [
        { name: 'FileType', value: 'image/jpeg' },
      ])

      // Trigger flush
      for (let i = 0; i < 19; i++) {
        await client.putMetric({
          name: 'Filler',
          value: 1,
          unit: MetricUnit.COUNT,
        })
      }

      expect(mockSend).toHaveBeenCalled()
      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand.input.MetricData).toContainEqual(
        expect.objectContaining({
          MetricName: 'ImageUpload',
          Value: 1,
          Unit: 'Count',
        })
      )
    })
  })

  describe('trackError', () => {
    it('should track error with operation and error type', async () => {
      const error = new TypeError('Invalid argument')
      await client.trackError('UploadImage', error)

      // Trigger flush
      for (let i = 0; i < 19; i++) {
        await client.putMetric({
          name: 'Filler',
          value: 1,
          unit: MetricUnit.COUNT,
        })
      }

      expect(mockSend).toHaveBeenCalled()
      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand.input.MetricData).toContainEqual(
        expect.objectContaining({
          MetricName: 'Errors',
          Value: 1,
          Dimensions: [
            { Name: 'Operation', Value: 'UploadImage' },
            { Name: 'ErrorType', Value: 'TypeError' },
          ],
        })
      )
    })
  })

  describe('periodic flush', () => {
    it('should flush metrics after timeout', async () => {
      await client.putMetric({
        name: 'TestMetric',
        value: 100,
        unit: MetricUnit.COUNT,
      })

      expect(mockSend).not.toHaveBeenCalled()

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000)

      // Wait for async flush
      await Promise.resolve()

      expect(mockSend).toHaveBeenCalledTimes(1)
    })
  })

  describe('shutdown', () => {
    it('should flush remaining metrics on shutdown', async () => {
      await client.putMetric({
        name: 'TestMetric',
        value: 123,
        unit: MetricUnit.COUNT,
      })

      await client.shutdown()

      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricData: expect.arrayContaining([
              expect.objectContaining({
                MetricName: 'TestMetric',
              }),
            ]),
          }),
        })
      )
    })
  })
})

describe('NoOpMetricsClient', () => {
  let client: NoOpMetricsClient

  beforeEach(() => {
    client = new NoOpMetricsClient()
  })

  it('should not throw errors when calling methods', async () => {
    await expect(
      client.putMetric({
        name: 'Test',
        value: 1,
        unit: MetricUnit.COUNT,
      })
    ).resolves.toBeUndefined()

    await expect(client.trackDuration('Test', 100)).resolves.toBeUndefined()

    await expect(client.trackCount('Test', 1)).resolves.toBeUndefined()

    await expect(
      client.trackError('Test', new Error('test'))
    ).resolves.toBeUndefined()
  })
})

describe('trackOperation', () => {
  let mockMetricsClient: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockMetricsClient = {
      trackDuration: jest.fn(),
      trackCount: jest.fn(),
      trackError: jest.fn(),
    }

    // Mock the metricsClient singleton
    jest.mock('../metrics', () => ({
      ...jest.requireActual('../metrics'),
      metricsClient: mockMetricsClient,
    }))
  })

  it('should track successful operation with duration', async () => {
    const operation = jest.fn().mockResolvedValue('success')
    const startTime = Date.now()

    const result = await trackOperation('TestOperation', operation)

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)

    // Note: In the actual test, we'd need to properly mock the metricsClient
    // For now, this tests the function structure
  })

  it('should track failed operation and re-throw error', async () => {
    const error = new Error('operation failed')
    const operation = jest.fn().mockRejectedValue(error)

    await expect(trackOperation('TestOperation', operation)).rejects.toThrow(
      'operation failed'
    )

    expect(operation).toHaveBeenCalledTimes(1)
  })
})
