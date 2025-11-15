import { jest } from '@jest/globals'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

/**
 * Mocks a successful backend response
 * @param data - The data to return from the mocked response
 * @example
 * mockSuccessfulBackendResponse({ id: '123', name: 'Test' })
 */
export function mockSuccessfulBackendResponse(data: any) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  } as Response)
}

/**
 * Mocks a backend error response
 * @param status - HTTP status code
 * @param error - Error message or object
 * @example
 * mockBackendError(404, { error: 'Not found' })
 */
export function mockBackendError(status: number, error: any = {}) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => error,
    text: async () => typeof error === 'string' ? error : JSON.stringify(error),
  } as Response)
}

/**
 * Mocks a network error (fetch throws)
 * @param message - Error message
 * @example
 * mockNetworkError('Connection timeout')
 */
export function mockNetworkError(message = 'Network error') {
  mockFetch.mockRejectedValueOnce(new Error(message))
}

/**
 * Gets the mock fetch instance for custom assertions
 */
export function getMockFetch() {
  return mockFetch
}
