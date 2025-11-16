import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getRequestLogger } from '@/lib/api'
import { handleApiError, trackOperation } from '@/lib/observability'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
const API_KEY = process.env.GARA_API_KEY

// GET /api/albums/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = getRequestLogger(request)

  try {
    logger.debug('Fetching album details', { albumId: params.id })

    const data = await trackOperation('FetchAlbum', async () => {
      const response = await fetch(`${BACKEND_URL}/api/albums/${params.id}`)

      if (!response.ok) {
        logger.warn('Album not found', { albumId: params.id, statusCode: response.status })
        throw new Error('Album not found')
      }

      return response.json()
    })

    logger.info('Album fetched successfully', { albumId: params.id })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, {
      operation: 'GET /api/albums/[id]',
      albumId: params.id,
    }, 404)
  }
}

// PUT /api/albums/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = getRequestLogger(request)

  try {
    const session = await getServerSession()
    if (!session) {
      logger.warn('Unauthorized album update attempt', { albumId: params.id })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    logger.debug('Updating album', { albumId: params.id, updates: Object.keys(body) })

    const data = await trackOperation('UpdateAlbum', async () => {
      const response = await fetch(`${BACKEND_URL}/api/albums/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY || ''
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        logger.warn('Album update failed', { albumId: params.id, statusCode: response.status })
        throw new Error(error.message ?? 'Album update failed')
      }

      return response.json()
    })

    logger.info('Album updated successfully', { albumId: params.id })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, {
      operation: 'PUT /api/albums/[id]',
      albumId: params.id,
    })
  }
}

// DELETE /api/albums/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = getRequestLogger(request)

  try {
    const session = await getServerSession()
    if (!session) {
      logger.warn('Unauthorized album deletion attempt', { albumId: params.id })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Deleting album', { albumId: params.id })

    const data = await trackOperation('DeleteAlbum', async () => {
      const response = await fetch(`${BACKEND_URL}/api/albums/${params.id}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': API_KEY || ''
        }
      })

      if (!response.ok) {
        const error = await response.json()
        logger.warn('Album deletion failed', { albumId: params.id, statusCode: response.status })
        throw new Error(error.message ?? 'Album deletion failed')
      }

      return response.json()
    })

    logger.info('Album deleted successfully', { albumId: params.id })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, {
      operation: 'DELETE /api/albums/[id]',
      albumId: params.id,
    })
  }
}
