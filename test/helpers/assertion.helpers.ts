import { expect } from '@jest/globals'
import { NextResponse } from 'next/server'
import { getMockFetch } from './fetch.helpers'

/**
 * Asserts that response is successful and returns parsed data
 * @param response - The response to check
 * @param expectedStatus - Expected HTTP status (default: 200)
 * @returns Parsed JSON data
 */
export async function expectSuccess(response: NextResponse, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus)
  return await response.json()
}

/**
 * Asserts that response indicates unauthorized (401)
 */
export async function expectUnauthorized(response: NextResponse) {
  expect(response.status).toBe(401)
  const data = await response.json()
  expect(data).toHaveProperty('error', 'Unauthorized')
}

/**
 * Asserts that response contains specific error
 * @param response - The response to check
 * @param expectedStatus - Expected HTTP status
 * @param expectedError - Expected error message
 */
export async function expectError(
  response: NextResponse,
  expectedStatus: number,
  expectedError: string
) {
  expect(response.status).toBe(expectedStatus)
  const data = await response.json()
  expect(data).toHaveProperty('error', expectedError)
}

/**
 * Asserts that backend was called with specific parameters
 * @param method - HTTP method
 * @param url - Expected URL (can be partial)
 * @param options - Additional options to check
 */
export function expectBackendCalledWith(
  method: string,
  url: string,
  options?: {
    body?: any
    headers?: Record<string, string>
  }
) {
  const mockFetch = getMockFetch()

  if (options?.body) {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(url),
      expect.objectContaining({
        method,
        body: JSON.stringify(options.body),
      })
    )
  } else if (options?.headers) {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(url),
      expect.objectContaining({
        headers: expect.objectContaining(options.headers),
      })
    )
  } else {
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(url))
  }
}

/**
 * Asserts that backend was NOT called
 */
export function expectBackendNotCalled() {
  const mockFetch = getMockFetch()
  expect(mockFetch).not.toHaveBeenCalled()
}

/**
 * Asserts response is 201 Created
 */
export async function expectCreated(response: NextResponse) {
  return await expectSuccess(response, 201)
}

/**
 * Asserts response is 400 Bad Request
 */
export async function expectBadRequest(response: NextResponse, expectedError?: string) {
  if (expectedError) {
    return await expectError(response, 400, expectedError)
  }
  expect(response.status).toBe(400)
  return await response.json()
}
