import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getRequestLogger } from '@/lib/api'
import { handleApiError, trackOperation } from '@/lib/observability'

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

async function getSignedUrlForKey(bucket: string, key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })
  return getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

export async function GET(request: NextRequest) {
  const logger = getRequestLogger(request)
  const startTime = Date.now()

  try {
    const bucketName = process.env.S3_BUCKET_NAME
    if (!bucketName) {
      logger.error('S3 bucket not configured')
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      )
    }

    logger.debug('Fetching images from S3', { bucket: bucketName, prefix: 'raw/' })

    const images = await trackOperation('FetchImagesFromS3', async () => {
      // List raw images (originals)
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'raw/',
      })

      const listResponse = await s3Client.send(listCommand)
      const imageList = []

      if (listResponse.Contents) {
        logger.debug('S3 objects found', { count: listResponse.Contents.length })

        for (const object of listResponse.Contents) {
          if (!object.Key) continue

          const fileName = object.Key.replace('raw/', '')
          if (!fileName) continue

          try {
            // Get signed URL
            const url = await getSignedUrlForKey(bucketName, object.Key)

            imageList.push({
              id: object.Key,
              name: fileName.split('.')[0],
              url: url,
              uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
            })
          } catch (error) {
            logger.warn('Failed to generate signed URL for object', {
              key: object.Key,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }

      return imageList
    })

    const duration = Date.now() - startTime
    logger.info('Images fetched successfully', {
      count: images.length,
      duration,
    })

    return NextResponse.json({ images: images.reverse() })
  } catch (error) {
    return handleApiError(error, {
      operation: 'GET /api/images',
      bucket: process.env.S3_BUCKET_NAME,
    })
  }
}
