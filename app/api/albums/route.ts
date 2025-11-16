import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getRequestLogger } from '@/lib/api'
import { handleApiError, trackOperation } from '@/lib/observability'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
const API_KEY = process.env.GARA_API_KEY

// GET /api/albums?published=true
export async function GET(request: NextRequest) {
  const logger = getRequestLogger(request)
  const startTime = Date.now()
  const searchParams = request.nextUrl.searchParams
  const published = searchParams.get('published')

  try {
    let url = `${BACKEND_URL}/api/albums`
    if (published) {
      url += `?published=${published}`
    }

    logger.debug('Fetching albums from backend', { url, published })

    const data = await trackOperation('FetchAlbums', async () => {
      const response = await fetch(url)

      if (!response.ok) {
        logger.warn('Backend returned error', {
          statusCode: response.status,
          url,
        })
        throw new Error(`Backend returned ${response.status}`)
      }

      return response.json()
    })

    const duration = Date.now() - startTime
    logger.info('Albums fetched successfully', {
      count: data.albums?.length ?? 0,
      duration,
    })

    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, {
      operation: 'GET /api/albums',
      published: published ?? undefined,
    })
  }
}

// POST /api/albums
export async function POST(request: NextRequest) {
  const logger = getRequestLogger(request)
  const startTime = Date.now()

  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      logger.warn('Unauthorized album creation attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    logger.debug('Creating new album', { albumName: body.name })

    const data = await trackOperation('CreateAlbum', async () => {
      const response = await fetch(`${BACKEND_URL}/api/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY || ''
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        logger.warn('Backend album creation failed', {
          statusCode: response.status,
        })
        const error = await response.json()
        throw new Error(error.message ?? 'Album creation failed')
      }

      return response.json()
    })

    const duration = Date.now() - startTime
    logger.info('Album created successfully', {
      albumId: data.id,
      duration,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleApiError(error, {
      operation: 'POST /api/albums',
    })
  }
}
