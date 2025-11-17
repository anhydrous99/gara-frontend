/**
 * Unit tests for metrics module
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { ConsoleMetricsClient, FileMetricsClient, NoOpMetricsClient, trackOperation } from '../metrics'
import { MetricUnit } from '../types'

// Mock filesystem operations for FileMetricsClient
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  appendFile: jest.fn().mockResolvedValue(undefined),
}))

describe('ConsoleMetricsClient', () => {
  let client: ConsoleMetricsClient
  let consoleSpy: jest.SpiedFunction<typeof console.log>

  beforeEach(() => {
    jest.clearAllMocks()
    // Spy on console methods since ConsoleMetricsClient uses logger which ultimately logs to console
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    client = new ConsoleMetricsClient('TestNamespace', true)
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('putMetric', () => {
    it('should not throw when putting metrics', async () => {
      await expect(
        client.putMetric({
          name: 'TestMetric',
          value: 123,
          unit: MetricUnit.COUNT,
        })
      ).resolves.toBeUndefined()
    })

    it('should handle metrics with dimensions', async () => {
      await expect(
        client.putMetric({
          name: 'ApiRequest',
          value: 250,
          unit: MetricUnit.MILLISECONDS,
          dimensions: [
            { name: 'Method', value: 'GET' },
            { name: 'StatusCode', value: '200' },
          ],
        })
      ).resolves.toBeUndefined()
    })

    it('should not throw when disabled', async () => {
      const disabledClient = new ConsoleMetricsClient('TestNamespace', false)

      await expect(
        disabledClient.putMetric({
          name: 'TestMetric',
          value: 100,
          unit: MetricUnit.COUNT,
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('trackDuration', () => {
    it('should track duration metric with dimensions', async () => {
      await expect(
        client.trackDuration('ApiRequest', 250, [
          { name: 'Method', value: 'GET' },
          { name: 'StatusCode', value: '200' },
        ])
      ).resolves.toBeUndefined()
    })
  })

  describe('trackCount', () => {
    it('should track count metric', async () => {
      await expect(
        client.trackCount('ImageUpload', 1, [
          { name: 'FileType', value: 'image/jpeg' },
        ])
      ).resolves.toBeUndefined()
    })
  })

  describe('trackError', () => {
    it('should track error with operation and error type', async () => {
      const error = new TypeError('Invalid argument')
      await expect(
        client.trackError('UploadImage', error)
      ).resolves.toBeUndefined()
    })

    it('should track error without specific type', async () => {
      const error = new Error('Generic error')
      await expect(
        client.trackError('ProcessImage', error)
      ).resolves.toBeUndefined()
    })
  })
})

describe('FileMetricsClient', () => {
  let client: FileMetricsClient

  beforeEach(async () => {
    jest.clearAllMocks()
    client = new FileMetricsClient('TestNamespace', true)
  })

  describe('putMetric', () => {
    it('should not throw when putting metrics', async () => {
      await expect(
        client.putMetric({
          name: 'TestMetric',
          value: 123,
          unit: MetricUnit.COUNT,
        })
      ).resolves.toBeUndefined()
    })

    it('should handle metrics with dimensions', async () => {
      await expect(
        client.putMetric({
          name: 'ApiRequest',
          value: 250,
          unit: MetricUnit.MILLISECONDS,
          dimensions: [
            { name: 'Method', value: 'GET' },
          ],
        })
      ).resolves.toBeUndefined()
    })

    it('should not throw when disabled', async () => {
      const disabledClient = new FileMetricsClient('TestNamespace', false)

      await expect(
        disabledClient.putMetric({
          name: 'TestMetric',
          value: 100,
          unit: MetricUnit.COUNT,
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('trackDuration', () => {
    it('should track duration metric', async () => {
      await expect(
        client.trackDuration('ApiRequest', 250)
      ).resolves.toBeUndefined()
    })
  })

  describe('trackCount', () => {
    it('should track count metric', async () => {
      await expect(
        client.trackCount('ImageUpload', 1)
      ).resolves.toBeUndefined()
    })
  })

  describe('trackError', () => {
    it('should track error metric', async () => {
      await expect(
        client.trackError('UploadImage', new Error('test'))
      ).resolves.toBeUndefined()
    })
  })

  describe('shutdown', () => {
    it('should flush metrics on shutdown', async () => {
      await client.putMetric({
        name: 'TestMetric',
        value: 123,
        unit: MetricUnit.COUNT,
      })

      await expect(client.shutdown()).resolves.toBeUndefined()
    })
  })
})

describe('NoOpMetricsClient', () => {
  let client: NoOpMetricsClient

  beforeEach(() => {
    client = new NoOpMetricsClient()
  })

  it('should not throw errors when calling putMetric', async () => {
    await expect(
      client.putMetric({
        name: 'Test',
        value: 1,
        unit: MetricUnit.COUNT,
      })
    ).resolves.toBeUndefined()
  })

  it('should not throw errors when calling trackDuration', async () => {
    await expect(client.trackDuration('Test', 100)).resolves.toBeUndefined()
  })

  it('should not throw errors when calling trackCount', async () => {
    await expect(client.trackCount('Test', 1)).resolves.toBeUndefined()
  })

  it('should not throw errors when calling trackError', async () => {
    await expect(
      client.trackError('Test', new Error('test'))
    ).resolves.toBeUndefined()
  })
})

describe('trackOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should execute operation and return result', async () => {
    const operation = jest.fn().mockResolvedValue('success')

    const result = await trackOperation('TestOperation', operation)

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should re-throw error from failed operation', async () => {
    const error = new Error('operation failed')
    const operation = jest.fn().mockRejectedValue(error)

    await expect(trackOperation('TestOperation', operation)).rejects.toThrow(
      'operation failed'
    )

    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should return operation result unchanged', async () => {
    const mockData = { data: 'test', count: 42 }
    const operation = jest.fn().mockResolvedValue(mockData)

    const result = await trackOperation('FetchData', operation)

    expect(result).toEqual(mockData)
    expect(result).toBe(mockData) // Verify same reference
  })

  it('should handle async operations', async () => {
    const operation = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return 'async result'
    })

    const result = await trackOperation('AsyncOp', operation)

    expect(result).toBe('async result')
  })
})
