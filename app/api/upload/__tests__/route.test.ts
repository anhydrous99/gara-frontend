/**
 * @jest-environment @edge-runtime/jest-environment
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Use manual mock from __mocks__ directory
jest.mock('next-auth')

import { POST } from '../route'
import { getServerSession } from 'next-auth'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Upload API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValueOnce(
        null
      )

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error', 'Unauthorized')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should allow authenticated requests', async () => {
      mockGetServerSession.mockResolvedValueOnce({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123', url: 'https://example.com/test.jpg' }),
      } as Response)

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('File Validation', () => {
    beforeEach(async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })
    })

    it('should reject requests without file', async () => {
      const formData = new FormData()

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'No file provided')
    })

    it('should reject files larger than 50MB', async () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      })

      const formData = new FormData()
      formData.append('file', largeFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'File too large')
    })

    it('should accept files under 50MB', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123', url: 'https://example.com/test.jpg' }),
      } as Response)

      const validFile = new File(['x'.repeat(1024 * 1024)], 'valid.jpg', {
        type: 'image/jpeg',
      })

      const formData = new FormData()
      formData.append('file', validFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept JPEG images', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      } as Response)

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept PNG images', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      } as Response)

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.png', { type: 'image/png' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept GIF images', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      } as Response)

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.gif', { type: 'image/gif' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept WebP images', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      } as Response)

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.webp', { type: 'image/webp' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should reject non-image files', async () => {
      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid file type')
    })

    it('should reject unsupported image formats', async () => {
      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.bmp', { type: 'image/bmp' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid file type')
    })
  })

  describe('Backend Integration', () => {
    beforeEach(async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })
    })

    it('should forward file to backend service', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123', url: 'https://example.com/test.jpg' }),
      } as Response)

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/images/upload',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should include API key in request headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      } as Response)

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
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

    it('should return upload result on success', async () => {
      const mockResult = {
        id: 'img-123',
        url: 'https://example.com/uploads/test.jpg',
        name: 'test.jpg',
        uploadedAt: Date.now(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response)

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResult)
    })

    it('should handle backend upload failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Backend upload error',
      } as Response)

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Internal server error')
    })
  })

  describe('Edge Cases', () => {
    beforeEach(async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', name: 'Admin' },
        expires: '2024-12-31',
      })
    })

    it('should handle files at exactly 50MB', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      } as Response)

      const exactFile = new File(['x'.repeat(50 * 1024 * 1024)], 'exact.jpg', {
        type: 'image/jpeg',
      })

      const formData = new FormData()
      formData.append('file', exactFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle files with special characters in name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      } as Response)

      const formData = new FormData()
      formData.append(
        'file',
        new File(['test'], 'test image (1) [copy].jpg', { type: 'image/jpeg' })
      )

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
        headers: new Headers(),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })
})
