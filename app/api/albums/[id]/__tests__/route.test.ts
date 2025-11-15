/**
 * @jest-environment @edge-runtime/jest-environment
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Use manual mock from __mocks__ directory
jest.mock('next-auth')

import { GET, PUT, DELETE } from '../route'
import { getServerSession } from 'next-auth'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Individual Album API Routes', () => {
  const mockParams = { params: { id: 'album-123' } }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('GET /api/albums/[id]', () => {
    it('should fetch a single album by id', async () => {
      const mockAlbum = {
        album_id: 'album-123',
        name: 'Summer Vacation',
        description: 'Photos from summer',
        cover_image_id: 'img-1',
        image_ids: ['img-1', 'img-2', 'img-3'],
        tags: ['vacation', 'summer'],
        published: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', { headers: new Headers() })
      const response = await GET(request, mockParams)
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/albums/album-123')
      expect(response.status).toBe(200)
      expect(data).toEqual(mockAlbum)
    })

    it('should return 404 for non-existent album', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/nonexistent', { headers: new Headers() })
      const response = await GET(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('error', 'Album not found')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', { headers: new Headers() })
      const response = await GET(request, mockParams)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Internal server error')
    })

    it('should work with different album IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: 'different-id' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/different-id', { headers: new Headers() })
      await GET(request, { params: { id: 'different-id' } })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/albums/different-id')
    })
  })

  describe('PUT /api/albums/[id]', () => {
    it('should reject unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValueOnce(
        null
      )

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', {
        method: 'PUT',
        headers: new Headers(),
        body: JSON.stringify({ name: 'Updated Album' }),
      })

      const response = await PUT(request, mockParams)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error', 'Unauthorized')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should update album when authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      const updateData = {
        name: 'Updated Album Name',
        description: 'Updated description',
        cover_image_id: 'img-5',
        tags: ['updated', 'tags'],
        published: true,
      }

      const mockUpdatedAlbum = {
        album_id: 'album-123',
        ...updateData,
        updated_at: Date.now(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedAlbum,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', {
        method: 'PUT',
        headers: new Headers(),
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request, mockParams)
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/albums/album-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify(updateData),
      })
      expect(response.status).toBe(200)
      expect(data).toEqual(mockUpdatedAlbum)
    })

    it('should include API key in headers', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', {
        method: 'PUT',
        headers: new Headers(),
        body: JSON.stringify({ name: 'Test' }),
      })

      await PUT(request, mockParams)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      )
    })

    it('should forward backend errors', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      const mockError = { error: 'Validation failed' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockError,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', {
        method: 'PUT',
        headers: new Headers(),
        body: JSON.stringify({ name: '' }),
      })

      const response = await PUT(request, mockParams)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual(mockError)
    })

    it('should handle network errors', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', {
        method: 'PUT',
        headers: new Headers(),
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await PUT(request, mockParams)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Internal server error')
    })
  })

  describe('DELETE /api/albums/[id]', () => {
    it('should reject unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValueOnce(
        null
      )

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', {
        method: 'DELETE',
        headers: new Headers(),
      })

      const response = await DELETE(request, mockParams)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error', 'Unauthorized')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should delete album when authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      const mockResponse = { success: true, message: 'Album deleted' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', {
        method: 'DELETE',
        headers: new Headers(),
      })

      const response = await DELETE(request, mockParams)
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/albums/album-123', {
        method: 'DELETE',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })
      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponse)
    })

    it('should include API key in headers', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', {
        method: 'DELETE',
        headers: new Headers(),
      })

      await DELETE(request, mockParams)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      )
    })

    it('should handle 404 errors from backend', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      const mockError = { error: 'Album not found' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockError,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/nonexistent', {
        method: 'DELETE',
        headers: new Headers(),
      })

      const response = await DELETE(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual(mockError)
    })

    it('should handle network errors', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const request = new NextRequest('http://localhost:3000/api/albums/album-123', {
        method: 'DELETE',
        headers: new Headers(),
      })

      const response = await DELETE(request, mockParams)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Internal server error')
    })
  })
})
