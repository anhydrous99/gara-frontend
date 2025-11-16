/**
 * Mock for @/lib/api
 */

import { jest } from '@jest/globals'

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn(function(this: any) { return this }),
}

export const getRequestId = jest.fn(() => 'test-request-id-123')
export const getClientIp = jest.fn(() => '127.0.0.1')
export const createRequestContext = jest.fn((request: any) => ({
  requestId: 'test-request-id-123',
  method: request.method || 'GET',
  url: new URL(request.url).pathname,
  userAgent: 'test-agent',
  ip: '127.0.0.1',
}))
export const getRequestLogger = jest.fn(() => mockLogger)
export const logRequest = jest.fn()
export const withRequestLogging = jest.fn((handler: any) => handler)
