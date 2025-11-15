/**
 * REFACTORED VERSION - Clean Code Principles Applied
 *
 * This is an example of how the tests should look after applying Clean Code principles.
 * Compare this with route.test.ts to see the improvements.
 *
 * Key improvements:
 * - DRY: Helper functions eliminate duplication
 * - Clear AAA pattern with comments
 * - Constants instead of magic values
 * - Descriptive names
 * - Much shorter and more readable
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Test utilities
import {
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  clearAllMocks,
} from '@/test/helpers/auth.helpers'
import {
  mockSuccessfulBackendResponse,
  mockBackendError,
  mockNetworkError,
} from '@/test/helpers/fetch.helpers'
import {
  expectSuccess,
  expectUnauthorized,
  expectError,
  expectCreated,
  expectBackendCalledWith,
  expectBackendNotCalled,
} from '@/test/helpers/assertion.helpers'
import {
  createMockAlbum,
  createMockAlbums,
  createAlbumData,
} from '@/test/factories/album.factory'
import {
  API_ENDPOINTS,
  BASE_URLS,
  HTTP_STATUS,
} from '@/test/constants/api.constants'
import { ERROR_MESSAGES } from '@/test/constants/errors.constants'

// Helper to create requests with base URL
function createGetRequest(queryParams?: string): NextRequest {
  const url = queryParams
    ? `${BASE_URLS.FRONTEND}${API_ENDPOINTS.ALBUMS}?${queryParams}`
    : `${BASE_URLS.FRONTEND}${API_ENDPOINTS.ALBUMS}`
  return new NextRequest(url)
}

function createPostRequest(albumData: ReturnType<typeof createAlbumData>): NextRequest {
  return new NextRequest(`${BASE_URLS.FRONTEND}${API_ENDPOINTS.ALBUMS}`, {
    method: 'POST',
    body: JSON.stringify(albumData),
  })
}

describe('Albums API Routes (Refactored)', () => {
  beforeEach(() => {
    clearAllMocks()
  })

  describe('GET /api/albums', () => {
    it('should return all albums successfully', async () => {
      // Arrange
      const mockAlbums = createMockAlbums(2)
      mockSuccessfulBackendResponse(mockAlbums)

      // Act
      const response = await GET(createGetRequest())

      // Assert
      const data = await expectSuccess(response)
      expect(data).toEqual(mockAlbums)
      expectBackendCalledWith('GET', API_ENDPOINTS.ALBUMS)
    })

    it('should filter albums by published status when query param provided', async () => {
      // Arrange
      const publishedAlbums = createMockAlbums(2, (_i) => ({ published: true }))
      mockSuccessfulBackendResponse(publishedAlbums)

      // Act
      const response = await GET(createGetRequest('published=true'))

      // Assert
      await expectSuccess(response)
      expectBackendCalledWith('GET', `${API_ENDPOINTS.ALBUMS}?published=true`)
    })

    it('should return 500 when backend fails', async () => {
      // Arrange
      mockBackendError(HTTP_STATUS.INTERNAL_SERVER_ERROR)

      // Act
      const response = await GET(createGetRequest())

      // Assert
      await expectError(response, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_MESSAGES.FETCH_ALBUMS_FAILED)
    })

    it('should handle network failures gracefully', async () => {
      // Arrange
      mockNetworkError()

      // Act
      const response = await GET(createGetRequest())

      // Assert
      await expectError(response, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    })
  })

  describe('POST /api/albums', () => {
    it('should reject requests when user is not authenticated', async () => {
      // Arrange
      await mockUnauthenticatedSession()
      const albumData = createAlbumData()

      // Act
      const response = await POST(createPostRequest(albumData))

      // Assert
      await expectUnauthorized(response)
      expectBackendNotCalled()
    })

    it('should create album successfully when user is authenticated', async () => {
      // Arrange
      await mockAuthenticatedSession()
      const albumData = createAlbumData({ name: 'My New Album' })
      const createdAlbum = createMockAlbum(albumData)
      mockSuccessfulBackendResponse(createdAlbum)

      // Act
      const response = await POST(createPostRequest(albumData))

      // Assert
      const data = await expectCreated(response)
      expect(data).toEqual(createdAlbum)
      expectBackendCalledWith('POST', API_ENDPOINTS.ALBUMS, {
        body: albumData,
        headers: { 'X-API-Key': 'test-api-key' },
      })
    })

    it('should include API key in backend request headers', async () => {
      // Arrange
      await mockAuthenticatedSession()
      const albumData = createAlbumData()
      mockSuccessfulBackendResponse({})

      // Act
      const _response = await POST(createPostRequest(albumData))

      // Assert
      expectBackendCalledWith('POST', API_ENDPOINTS.ALBUMS, {
        headers: { 'X-API-Key': 'test-api-key' },
      })
    })

    it('should forward validation errors from backend', async () => {
      // Arrange
      await mockAuthenticatedSession()
      const invalidAlbumData = createAlbumData({ name: '' })
      mockBackendError(HTTP_STATUS.BAD_REQUEST, { error: 'Invalid album data' })

      // Act
      const response = await POST(createPostRequest(invalidAlbumData))

      // Assert
      await expectError(response, HTTP_STATUS.BAD_REQUEST, 'Invalid album data')
    })

    it('should handle network failures during creation', async () => {
      // Arrange
      await mockAuthenticatedSession()
      const albumData = createAlbumData()
      mockNetworkError('Connection timeout')

      // Act
      const response = await POST(createPostRequest(albumData))

      // Assert
      await expectError(response, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    })
  })

  describe('Environment Configuration', () => {
    it('should use correct backend URL from environment', () => {
      // Assert
      expect(process.env.NEXT_PUBLIC_API_URL).toBe(BASE_URLS.BACKEND)
    })

    it('should have API key configured in environment', () => {
      // Assert
      expect(process.env.GARA_API_KEY).toBe('test-api-key')
    })
  })
})
