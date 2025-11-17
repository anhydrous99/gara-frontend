import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getRequestLogger } from '@/lib/api'
import { handleApiError, trackOperation, metricsClient } from '@/lib/observability'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(request: NextRequest) {
  const logger = getRequestLogger(request)
  const startTime = Date.now()

  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      logger.warn('Unauthorized upload attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      logger.warn('Upload request missing file')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      logger.warn('File too large', {
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE,
        fileName: file.name,
      })
      await metricsClient.trackCount('UploadRejected', 1, [
        { name: 'Reason', value: 'FileTooLarge' },
      ])
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!VALID_TYPES.includes(file.type)) {
      logger.warn('Invalid file type', {
        fileType: file.type,
        fileName: file.name,
      })
      await metricsClient.trackCount('UploadRejected', 1, [
        { name: 'Reason', value: 'InvalidFileType' },
      ])
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    logger.debug('Uploading file to backend', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })

    const result = await trackOperation('UploadImage', async () => {
      // Forward to gara-image service
      const garaImageUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const uploadUrl = `${garaImageUrl}/api/images/upload`

      const uploadFormData = new FormData()
      uploadFormData.append('image', file)

      // Add API key header if configured
      const headers: Record<string, string> = {}
      if (process.env.GARA_API_KEY) {
        headers['X-API-Key'] = process.env.GARA_API_KEY
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: uploadFormData,
        headers,
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('Backend upload failed', undefined, {
          statusCode: response.status,
          error,
        })
        throw new Error(error || 'Upload failed')
      }

      return response.json()
    })

    const duration = Date.now() - startTime
    logger.info('File uploaded successfully', {
      fileName: file.name,
      fileSize: file.size,
      duration,
    })

    await metricsClient.trackCount('ImageUploaded', 1, [
      { name: 'FileType', value: file.type },
    ])

    return NextResponse.json(result)
  } catch (error) {
    await metricsClient.trackCount('UploadFailed', 1)
    return handleApiError(error, {
      operation: 'POST /api/upload',
    })
  }
}
