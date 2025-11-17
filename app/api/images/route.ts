import { NextRequest, NextResponse } from 'next/server'
import { getRequestLogger } from '@/lib/api'
import { handleApiError, trackOperation } from '@/lib/observability'

export async function GET(request: NextRequest) {
  const logger = getRequestLogger(request)
  const startTime = Date.now()

  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

    if (!BACKEND_URL || BACKEND_URL.trim() === '') {
      logger.error('Backend API URL not configured')
      return NextResponse.json(
        { error: 'Backend API not configured' },
        { status: 500 }
      )
    }

    logger.debug('Fetching images from backend API', { url: BACKEND_URL })

    const data = await trackOperation('FetchImagesFromBackend', async () => {
      const response = await fetch(`${BACKEND_URL}/api/images`)

      if (!response.ok) {
        logger.warn('Backend returned error', {
          statusCode: response.status,
          url: `${BACKEND_URL}/api/images`,
        })
        throw new Error(`Backend returned ${response.status}`)
      }

      return response.json()
    })

    const duration = Date.now() - startTime
    logger.info('Images fetched successfully', {
      count: data.images?.length ?? 0,
      duration,
    })

    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, {
      operation: 'GET /api/images',
      backendUrl: process.env.NEXT_PUBLIC_API_URL,
    })
  }
}
