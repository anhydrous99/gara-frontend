/**
 * Mock for @/lib/observability
 */

import { jest } from '@jest/globals'
import { NextResponse } from 'next/server'

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  child: jest.fn(function(this: any) { return this }),
}

export const logger = mockLogger
export const createRequestLogger = jest.fn(() => mockLogger)

export const metricsClient = {
  putMetric: jest.fn(),
  trackDuration: jest.fn(),
  trackCount: jest.fn(),
  trackError: jest.fn(),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trackOperation = jest.fn(async (_name: string, operation: () => Promise<any>) => {
  return await operation()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleApiError = jest.fn((error: unknown, context: any, statusCode = 500) => {
  const message = error instanceof Error ? error.message : 'Internal server error'
  return NextResponse.json(
    { error: statusCode >= 500 ? 'Internal server error' : message },
    { status: statusCode }
  )
})

export const observabilityConfig = {
  logLevel: 'info',
  enableMetrics: false,
  enableRequestLogging: true,
  cloudWatch: {
    namespace: 'Test',
    region: 'us-east-1',
    enabled: false,
  },
}
