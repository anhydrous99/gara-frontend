/**
 * @jest-environment @edge-runtime/jest-environment
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '../route'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('GET /api/images', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Backend API Configuration', () => {
    it('should return error when backend API URL is not configured', async () => {
      delete process.env.NEXT_PUBLIC_API_URL

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Backend API not configured')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should use configured backend API URL', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://backend:8080'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [], total: 0, limit: 100, offset: 0 }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      await GET(request)

      expect(mockFetch).toHaveBeenCalledWith('http://backend:8080/api/images')
    })
  })

  describe('Successful Responses', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080'
    })

    it('should return empty list when no images exist', async () => {
      const mockBackendResponse = {
        images: [],
        total: 0,
        limit: 100,
        offset: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockBackendResponse)
      expect(data.images).toHaveLength(0)
      expect(data.total).toBe(0)
    })

    it('should return list of images from backend', async () => {
      const mockBackendResponse = {
        images: [
          {
            id: 'a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4',
            name: 'sunset-beach',
            url: 'https://gara-images.s3.amazonaws.com/raw/a3b5c7d9...?X-Amz-Signature=...',
            uploadedAt: '2025-11-17T14:30:00.000Z',
            size: 2458624,
            format: 'jpeg',
            width: 1920,
            height: 1080,
          },
          {
            id: 'b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6',
            name: 'mountain-landscape',
            url: 'https://gara-images.s3.amazonaws.com/raw/b4c6d8e0...?X-Amz-Signature=...',
            uploadedAt: '2025-11-17T15:45:00.000Z',
            size: 3145728,
            format: 'png',
            width: 2560,
            height: 1440,
          },
        ],
        total: 2,
        limit: 100,
        offset: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockBackendResponse)
      expect(data.images).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(data.images[0]).toHaveProperty('id')
      expect(data.images[0]).toHaveProperty('name')
      expect(data.images[0]).toHaveProperty('url')
      expect(data.images[0]).toHaveProperty('uploadedAt')
    })

    it('should handle large image lists with pagination', async () => {
      const mockImages = Array.from({ length: 100 }, (_, i) => ({
        id: `image-id-${i}`,
        name: `image-${i}`,
        url: `https://example.com/image-${i}.jpg`,
        uploadedAt: new Date().toISOString(),
        size: 1024000,
        format: 'jpeg',
        width: 1920,
        height: 1080,
      }))

      const mockBackendResponse = {
        images: mockImages,
        total: 247,
        limit: 100,
        offset: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.images).toHaveLength(100)
      expect(data.total).toBe(247)
      expect(data.limit).toBe(100)
    })

    it('should return images with all required metadata fields', async () => {
      const mockBackendResponse = {
        images: [
          {
            id: 'a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4',
            name: 'test-image',
            url: 'https://example.com/test.jpg',
            uploadedAt: '2025-11-17T14:30:00.000Z',
            size: 1024000,
            format: 'jpeg',
            width: 1920,
            height: 1080,
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      const image = data.images[0]
      expect(image).toHaveProperty('id')
      expect(image).toHaveProperty('name')
      expect(image).toHaveProperty('url')
      expect(image).toHaveProperty('uploadedAt')
      expect(image).toHaveProperty('size')
      expect(image).toHaveProperty('format')
      expect(image).toHaveProperty('width')
      expect(image).toHaveProperty('height')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080'
    })

    it('should handle backend 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
    })

    it('should handle backend 500 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Internal server error')
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Internal server error')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
    })
  })

  describe('Response Format', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080'
    })

    it('should preserve backend response structure', async () => {
      const mockBackendResponse = {
        images: [
          {
            id: 'test-id',
            name: 'test',
            url: 'https://example.com/test.jpg',
            uploadedAt: '2025-11-17T14:30:00.000Z',
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual(mockBackendResponse)
    })

    it('should handle response with additional backend metadata', async () => {
      const mockBackendResponse = {
        images: [],
        total: 0,
        limit: 100,
        offset: 0,
        hasMore: false,
        nextOffset: null,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual(mockBackendResponse)
      expect(data).toHaveProperty('hasMore')
      expect(data).toHaveProperty('nextOffset')
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080'
    })

    it('should handle empty backend URL', async () => {
      process.env.NEXT_PUBLIC_API_URL = ''

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Backend API not configured')
    })

    it('should handle backend with trailing slash', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080/'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [], total: 0, limit: 100, offset: 0 }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      await GET(request)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080//api/images')
    })

    it('should handle very large image lists', async () => {
      const mockImages = Array.from({ length: 1000 }, (_, i) => ({
        id: `id-${i}`,
        name: `image-${i}`,
        url: `https://example.com/${i}.jpg`,
        uploadedAt: new Date().toISOString(),
      }))

      const mockBackendResponse = {
        images: mockImages,
        total: 10000,
        limit: 1000,
        offset: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/images')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.images).toHaveLength(1000)
    })
  })
})
