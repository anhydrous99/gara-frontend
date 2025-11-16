/**
 * @jest-environment node
 */

/**
 * Unit tests for error handler module
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  handleApiError,
  createContextualError,
  ErrorSeverity,
} from '../errorHandler'
import { ContextualError } from '../types'

// Mock dependencies
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

jest.mock('../metrics', () => ({
  metricsClient: {
    trackError: jest.fn(),
    trackCount: jest.fn(),
  },
}))

describe('errorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('handleApiError', () => {
    it('should return 500 status by default', async () => {
      const error = new Error('test error')
      const response = await handleApiError(error, {
        operation: 'TestOperation',
      })

      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Internal server error')
    })

    it('should use provided status code', async () => {
      const error = new Error('not found')
      const response = await handleApiError(
        error,
        { operation: 'FetchItem' },
        404
      )

      expect(response.status).toBe(404)
    })

    it('should include user message when provided', async () => {
      const error = new Error('database error')
      const response = await handleApiError(
        error,
        { operation: 'SaveData' },
        500,
        'Could not save data'
      )

      const data = await response.json()

      expect(data.error).toBe('Could not save data')
    })

    it('should expose client errors (4xx) but hide server errors (5xx)', async () => {
      const clientError = new Error('Invalid input')
      const clientResponse = await handleApiError(
        clientError,
        { operation: 'Validate' },
        400
      )
      const clientData = await clientResponse.json()

      expect(clientData.error).toBe('Invalid input')

      const serverError = new Error('Database connection failed')
      const serverResponse = await handleApiError(
        serverError,
        { operation: 'DBQuery' },
        500
      )
      const serverData = await serverResponse.json()

      expect(serverData.error).toBe('Internal server error')
      expect(serverData.error).not.toBe('Database connection failed')
    })

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('test error')
      error.stack = 'Error: test error\n    at test.ts:10'

      const response = await handleApiError(error, { operation: 'Test' })
      const data = await response.json()

      expect(data.details).toBeDefined()
      expect(data.details).toHaveProperty('name', 'Error')
      expect(data.details).toHaveProperty('stack')

      process.env.NODE_ENV = originalEnv
    })

    it('should handle non-Error objects', async () => {
      const stringError = 'Something went wrong'
      const response = await handleApiError(stringError, { operation: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
    })
  })

  describe('createContextualError', () => {
    it('should create error with context', () => {
      const context = { userId: '123', operation: 'upload' }
      const error = createContextualError('Upload failed', context)

      expect(error).toBeInstanceOf(ContextualError)
      expect(error.message).toBe('Upload failed')
      expect(error.context).toEqual(context)
      expect(error.name).toBe('ContextualError')
    })

    it('should wrap original error', () => {
      const originalError = new Error('Network timeout')
      const error = createContextualError(
        'Request failed',
        { requestId: 'abc' },
        originalError
      )

      expect(error.originalError).toBe(originalError)
      expect(error.stack).toBe(originalError.stack)
    })
  })

  describe('ErrorSeverity', () => {
    it('should have correct severity levels', () => {
      expect(ErrorSeverity.LOW).toBe('low')
      expect(ErrorSeverity.MEDIUM).toBe('medium')
      expect(ErrorSeverity.HIGH).toBe('high')
      expect(ErrorSeverity.CRITICAL).toBe('critical')
    })
  })
})
