import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getRequestLogger } from '@/lib/api'
import { handleApiError, trackOperation } from '@/lib/observability'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
const API_KEY = process.env.GARA_API_KEY

// PUT /api/albums/[id]/reorder
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = getRequestLogger(request)

  try {
    const session = await getServerSession()
    if (!session) {
      logger.warn('Unauthorized reorder attempt', { albumId: params.id })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    logger.debug('Reordering album images', {
      albumId: params.id,
      imageCount: body.imageIds?.length ?? 0,
    })

    const response = await trackOperation('ReorderAlbumImages', async () => {
      return await fetch(
        `${BACKEND_URL}/api/albums/${params.id}/reorder`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY || ''
          },
          body: JSON.stringify(body)
        }
      )
    })

    if (!response.ok) {
      logger.warn('Reorder failed', { albumId: params.id, statusCode: response.status })
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    logger.info('Album images reordered successfully', { albumId: params.id })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, {
      operation: 'PUT /api/albums/[id]/reorder',
      albumId: params.id,
    })
  }
}
