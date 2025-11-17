import { NextRequest, NextResponse } from 'next/server'
import { getRequestLogger } from '@/lib/api'
import { handleApiError, trackOperation } from '@/lib/observability'
import { localFileStorage } from '@/lib/storage/local-file-storage'

export async function GET(request: NextRequest) {
  const logger = getRequestLogger(request)
  const startTime = Date.now()

  try {
    logger.debug('Fetching images from local storage')

    const images = await trackOperation('FetchImagesFromLocalStorage', async () => {
      return await localFileStorage.listImages()
    })

    const duration = Date.now() - startTime
    logger.info('Images fetched successfully', {
      count: images.length,
      duration,
    })

    return NextResponse.json({ images })
  } catch (error) {
    return handleApiError(error, {
      operation: 'GET /api/images',
    })
  }
}
