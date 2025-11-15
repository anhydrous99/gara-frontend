import { jest } from '@jest/globals'

/**
 * Mocks an authenticated session for testing protected routes
 * @example
 * await mockAuthenticatedSession()
 */
export async function mockAuthenticatedSession() {
  const { getServerSession } = await import('next-auth')
  ;(getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValueOnce({
    user: { id: '1', name: 'Admin', email: 'admin@test.com' },
    expires: '2024-12-31',
  })
}

/**
 * Mocks an unauthenticated session (no user logged in)
 * @example
 * await mockUnauthenticatedSession()
 */
export async function mockUnauthenticatedSession() {
  const { getServerSession } = await import('next-auth')
  ;(getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValueOnce(null)
}

/**
 * Clears all mocks - use in beforeEach
 */
export function clearAllMocks() {
  jest.clearAllMocks()
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  mockFetch.mockClear()
}
