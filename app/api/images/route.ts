import { NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

async function getSignedUrlForKey(bucket: string, key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    return url
  } catch (error) {
    console.error('Error generating signed URL:', error)
    return ''
  }
}

export async function GET(request: Request) {
  try {
    const bucketName = process.env.S3_BUCKET_NAME
    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      )
    }

    // List raw images (originals)
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'raw/',
    })

    const listResponse = await s3Client.send(listCommand)
    const images = []

    if (listResponse.Contents) {
      for (const object of listResponse.Contents) {
        if (!object.Key) continue

        const fileName = object.Key.replace('raw/', '')
        if (!fileName) continue

        // Get signed URL
        const url = await getSignedUrlForKey(bucketName, object.Key)

        images.push({
          id: object.Key,
          name: fileName.split('.')[0],
          url: url,
          uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({ images: images.reverse() })
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}
