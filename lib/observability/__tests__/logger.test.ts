/**
 * @jest-environment node
 */

/**
 * Unit tests for logger module
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { Logger, BrowserLogger } from '../logger'
import { LogLevel } from '../types'
import pino from 'pino'

// Mock pino
jest.mock('pino', () => {
  const mockPinoInstance = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn(),
  }

  const mockPino = jest.fn(() => mockPinoInstance)
  return {
    __esModule: true,
    default: mockPino,
  }
})

describe('Logger', () => {
  let mockPinoInstance: any
  let logger: Logger

  beforeEach(() => {
    jest.clearAllMocks()
    mockPinoInstance = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn(() => mockPinoInstance),
    }
    logger = new Logger(mockPinoInstance)
  })

  describe('debug', () => {
    it('should log debug message without context', () => {
      logger.debug('test message')

      expect(mockPinoInstance.debug).toHaveBeenCalledWith({}, 'test message')
    })

    it('should log debug message with context', () => {
      const context = { userId: '123', action: 'test' }
      logger.debug('test message', context)

      expect(mockPinoInstance.debug).toHaveBeenCalledWith(context, 'test message')
    })
  })

  describe('info', () => {
    it('should log info message', () => {
      logger.info('info message')

      expect(mockPinoInstance.info).toHaveBeenCalledWith({}, 'info message')
    })

    it('should log info message with context', () => {
      const context = { requestId: 'abc-123' }
      logger.info('request completed', context)

      expect(mockPinoInstance.info).toHaveBeenCalledWith(context, 'request completed')
    })
  })

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('warning message')

      expect(mockPinoInstance.warn).toHaveBeenCalledWith({}, 'warning message')
    })
  })

  describe('error', () => {
    it('should log error without Error object', () => {
      logger.error('error message')

      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        { error: undefined },
        'error message'
      )
    })

    it('should log error with Error object', () => {
      const error = new Error('test error')
      logger.error('operation failed', error)

      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        {
          error: {
            name: 'Error',
            message: 'test error',
            stack: expect.any(String),
          },
        },
        'operation failed'
      )
    })

    it('should log error with context', () => {
      const error = new Error('test error')
      const context = { operation: 'fetchData', userId: '123' }
      logger.error('operation failed', error, context)

      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        {
          ...context,
          error: {
            name: 'Error',
            message: 'test error',
            stack: expect.any(String),
          },
        },
        'operation failed'
      )
    })
  })

  describe('fatal', () => {
    it('should log fatal error', () => {
      const error = new Error('critical error')
      logger.fatal('system failure', error)

      expect(mockPinoInstance.fatal).toHaveBeenCalledWith(
        {
          error: {
            name: 'Error',
            message: 'critical error',
            stack: expect.any(String),
          },
        },
        'system failure'
      )
    })
  })

  describe('child', () => {
    it('should create child logger with context', () => {
      const context = { requestId: '123', userId: 'abc' }
      const childLogger = logger.child(context)

      expect(mockPinoInstance.child).toHaveBeenCalledWith(context)
      expect(childLogger).toBeInstanceOf(Logger)
    })
  })
})

describe('BrowserLogger', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>
  let browserLogger: BrowserLogger

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    browserLogger = new BrowserLogger()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('debug', () => {
    it('should log to console.log with JSON format', () => {
      browserLogger.debug('test message')

      expect(consoleLogSpy).toHaveBeenCalled()
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(loggedData).toMatchObject({
        level: 'debug',
        message: 'test message',
        timestamp: expect.any(String),
      })
    })

    it('should include context in log', () => {
      const context = { userId: '123' }
      browserLogger.debug('test', context)

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(loggedData).toMatchObject({
        level: 'debug',
        message: 'test',
        userId: '123',
      })
    })
  })

  describe('info', () => {
    it('should log to console.log', () => {
      browserLogger.info('info message')

      expect(consoleLogSpy).toHaveBeenCalled()
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(loggedData.level).toBe('info')
      expect(loggedData.message).toBe('info message')
    })
  })

  describe('warn', () => {
    it('should log to console.warn', () => {
      browserLogger.warn('warning message')

      expect(consoleWarnSpy).toHaveBeenCalled()
      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string)
      expect(loggedData.level).toBe('warn')
    })
  })

  describe('error', () => {
    it('should log to console.error with error details', () => {
      const error = new Error('test error')
      browserLogger.error('operation failed', error)

      expect(consoleErrorSpy).toHaveBeenCalled()
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string)
      expect(loggedData).toMatchObject({
        level: 'error',
        message: 'operation failed',
        error: {
          name: 'Error',
          message: 'test error',
          stack: expect.any(String),
        },
      })
    })
  })

  describe('child', () => {
    it('should create child logger with merged context', () => {
      const parentContext = { requestId: '123' }
      const parent = new BrowserLogger(parentContext)

      const childContext = { userId: 'abc' }
      const child = parent.child(childContext)

      child.info('test')

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(loggedData).toMatchObject({
        requestId: '123',
        userId: 'abc',
      })
    })
  })
})
