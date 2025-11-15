/**
 * @jest-environment @edge-runtime/jest-environment
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Use manual mock from __mocks__ directory
jest.mock('next-auth')

import { DELETE } from '../route'
import { getServerSession } from 'next-auth'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('DELETE /api/albums/[id]/images/[imageId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/albums/123/images/img1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: '123', imageId: 'img1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Successful operations', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'admin@example.com' },
        expires: '2024-12-31'
      })
    })

    it('should delete image from album successfully', async () => {
      const mockResponse = {
        album_id: '123',
        removed_image_id: 'img1',
        message: 'Image removed successfully'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/images/img1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: '123', imageId: 'img1' } })
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/albums/123/images/img1',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'X-API-Key': 'test-api-key'
          }
        })
      )
      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponse)
    })

    it('should handle deletion with UUID image ID', async () => {
      const imageId = '550e8400-e29b-41d4-a716-446655440000'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: '123', removed_image_id: imageId }),
      } as Response)

      const request = new NextRequest(`http://localhost:3000/api/albums/123/images/${imageId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: '123', imageId } })

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/albums/123/images/${imageId}`,
        expect.any(Object)
      )
      expect(response.status).toBe(200)
    })
  })

  describe('Error handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'admin@example.com' },
        expires: '2024-12-31'
      })
    })

    it('should handle image not found in album', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Image not found in album' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/images/nonexistent', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: '123', imageId: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Image not found in album' })
    })

    it('should handle album not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Album not found' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/nonexistent/images/img1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'nonexistent', imageId: 'img1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Album not found' })
    })

    it('should handle backend server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database error' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/images/img1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: '123', imageId: 'img1' } })

      expect(response.status).toBe(500)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const request = new NextRequest('http://localhost:3000/api/albums/123/images/img1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: '123', imageId: 'img1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('should handle forbidden access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/images/img1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: '123', imageId: 'img1' } })

      expect(response.status).toBe(403)
    })
  })

  describe('Edge cases', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'admin@example.com' },
        expires: '2024-12-31'
      })
    })

    it('should handle album ID with special characters', async () => {
      const albumId = 'album-123_test'
      const imageId = 'img-456_test'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: albumId, removed_image_id: imageId }),
      } as Response)

      const request = new NextRequest(`http://localhost:3000/api/albums/${albumId}/images/${imageId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: albumId, imageId } })

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/albums/${albumId}/images/${imageId}`,
        expect.any(Object)
      )
      expect(response.status).toBe(200)
    })

    it('should handle numeric string IDs', async () => {
      const albumId = '12345'
      const imageId = '67890'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: albumId, removed_image_id: imageId }),
      } as Response)

      const request = new NextRequest(`http://localhost:3000/api/albums/${albumId}/images/${imageId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: albumId, imageId } })

      expect(response.status).toBe(200)
    })

    it('should handle long image IDs', async () => {
      const longImageId = 'very-long-image-id-with-many-characters-and-dashes-12345678901234567890'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: '123', removed_image_id: longImageId }),
      } as Response)

      const request = new NextRequest(`http://localhost:3000/api/albums/123/images/${longImageId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: '123', imageId: longImageId } })

      expect(response.status).toBe(200)
    })
  })
})
