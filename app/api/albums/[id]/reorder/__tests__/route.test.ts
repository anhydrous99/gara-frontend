/**
 * @jest-environment @edge-runtime/jest-environment
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Use manual mock from __mocks__ directory
jest.mock('next-auth')

import { PUT } from '../route'
import { getServerSession } from 'next-auth'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('PUT /api/albums/[id]/reorder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image_ids: ['img2', 'img1', 'img3'] })
      })

      const response = await PUT(request, { params: { id: '123' } })
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

    it('should reorder images in album successfully', async () => {
      const mockReorderData = {
        image_ids: ['img3', 'img1', 'img2']
      }

      const mockResponse = {
        album_id: '123',
        image_ids: ['img3', 'img1', 'img2'],
        message: 'Album images reordered successfully'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(mockReorderData)
      })

      const response = await PUT(request, { params: { id: '123' } })
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/albums/123/reorder',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key'
          },
          body: JSON.stringify(mockReorderData)
        })
      )
      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponse)
    })

    it('should handle reordering with single image', async () => {
      const mockReorderData = {
        image_ids: ['img1']
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: '123', image_ids: ['img1'] }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(mockReorderData)
      })

      const response = await PUT(request, { params: { id: '123' } })

      expect(response.status).toBe(200)
    })

    it('should handle reordering many images', async () => {
      const imageIds = Array.from({ length: 50 }, (_, i) => `img${i}`).reverse()
      const mockReorderData = {
        image_ids: imageIds
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: '123', image_ids: imageIds }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(mockReorderData)
      })

      const response = await PUT(request, { params: { id: '123' } })

      expect(response.status).toBe(200)
    })

    it('should handle empty image array', async () => {
      const mockReorderData = {
        image_ids: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: '123', image_ids: [] }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(mockReorderData)
      })

      const response = await PUT(request, { params: { id: '123' } })

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

    it('should handle backend validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid image order' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image_ids: ['invalid'] })
      })

      const response = await PUT(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid image order' })
    })

    it('should handle album not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Album not found' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/nonexistent/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image_ids: ['img1', 'img2'] })
      })

      const response = await PUT(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Album not found' })
    })

    it('should handle image mismatch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Image IDs do not match album contents' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image_ids: ['img1', 'img5'] })
      })

      const response = await PUT(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Image IDs do not match album contents' })
    })

    it('should handle backend server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database error' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image_ids: ['img1', 'img2'] })
      })

      const response = await PUT(request, { params: { id: '123' } })

      expect(response.status).toBe(500)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image_ids: ['img1', 'img2'] })
      })

      const response = await PUT(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: 'invalid json'
      })

      const response = await PUT(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
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
      const imageIds = ['img-1_test', 'img-2_test']

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: albumId, image_ids: imageIds }),
      } as Response)

      const request = new NextRequest(`http://localhost:3000/api/albums/${albumId}/reorder`, {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image_ids: imageIds })
      })

      const response = await PUT(request, { params: { id: albumId } })

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/albums/${albumId}/reorder`,
        expect.any(Object)
      )
      expect(response.status).toBe(200)
    })

    it('should handle reverse order', async () => {
      const originalOrder = ['img1', 'img2', 'img3', 'img4']
      const reversedOrder = [...originalOrder].reverse()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: '123', image_ids: reversedOrder }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image_ids: reversedOrder })
      })

      const response = await PUT(request, { params: { id: '123' } })

      expect(response.status).toBe(200)
    })

    it('should handle UUID image IDs', async () => {
      const imageIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ album_id: '123', image_ids: imageIds }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums/123/reorder', {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image_ids: imageIds })
      })

      const response = await PUT(request, { params: { id: '123' } })

      expect(response.status).toBe(200)
    })
  })
})
