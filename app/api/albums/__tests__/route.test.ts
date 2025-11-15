import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Use manual mock from __mocks__ directory
jest.mock('next-auth')

import { GET, POST } from '../route'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Albums API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('GET /api/albums', () => {
    it('should fetch all albums successfully', async () => {
      const mockAlbums = [
        {
          album_id: '1',
          name: 'Test Album',
          description: 'Test Description',
          cover_image_id: 'img1',
          image_ids: ['img1', 'img2'],
          tags: ['nature'],
          published: true,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbums,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums')
      const response = await GET(request)
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/albums')
      expect(response.status).toBe(200)
      expect(data).toEqual(mockAlbums)
    })

    it('should filter albums by published status', async () => {
      const mockAlbums = [
        {
          album_id: '1',
          name: 'Published Album',
          published: true,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbums,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums?published=true')
      const response = await GET(request)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/albums?published=true')
      expect(response.status).toBe(200)
    })

    it('should handle backend errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Failed to fetch albums')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/albums')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Internal server error')
    })
  })

  describe('POST /api/albums', () => {
    it('should reject unauthenticated requests', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValueOnce(
        null
      )

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Album',
          description: 'Test',
          tags: [],
          published: false,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error', 'Unauthorized')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should create album when authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValueOnce({
        user: { id: '1', name: 'Admin', email: 'admin@test.com' },
        expires: '2024-12-31',
      })

      const mockCreatedAlbum = {
        album_id: '123',
        name: 'Test Album',
        description: 'Test Description',
        tags: ['test'],
        published: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedAlbum,
      } as Response)

      const albumData = {
        name: 'Test Album',
        description: 'Test Description',
        tags: ['test'],
        published: false,
      }

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify(albumData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/albums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify(albumData),
      })
      expect(response.status).toBe(201)
      expect(data).toEqual(mockCreatedAlbum)
    })

    it('should include API key in request headers', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          description: '',
          tags: [],
          published: false,
        }),
      })

      await POST(request)

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
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      const mockError = { error: 'Invalid album data' }
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockError,
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          description: '',
          tags: [],
          published: false,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual(mockError)
    })

    it('should handle network errors during creation', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          description: '',
          tags: [],
          published: false,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Internal server error')
    })
  })

  describe('Environment Configuration', () => {
    it('should use correct backend URL', () => {
      expect(process.env.NEXT_PUBLIC_API_URL).toBe('http://localhost:8080')
    })

    it('should have API key configured', () => {
      expect(process.env.GARA_API_KEY).toBe('test-api-key')
    })
  })
})
