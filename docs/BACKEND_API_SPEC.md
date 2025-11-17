# Backend API Specification - Image Listing Endpoint

This document specifies the required backend API endpoint to enable full image management functionality in the frontend.

## Overview

The frontend currently has direct file system access for image storage but can optionally use a backend API. To support backend-based image storage, we need an endpoint to list all available images.

## Required Endpoint

### GET /api/images

List all uploaded images with their metadata.

## OpenAPI Specification

```yaml
/api/images:
  get:
    summary: List all uploaded images
    description: |
      Retrieve a list of all uploaded images with their metadata.
      This endpoint is required for the gallery view to display available images.
      Returns image IDs, URLs, and metadata for all images in the system.
    parameters:
      - name: limit
        in: query
        required: false
        description: Maximum number of images to return (pagination)
        schema:
          type: integer
          minimum: 1
          maximum: 1000
          default: 100
        example: 50
      - name: offset
        in: query
        required: false
        description: Number of images to skip (pagination)
        schema:
          type: integer
          minimum: 0
          default: 0
        example: 0
      - name: sort
        in: query
        required: false
        description: Sort order for results
        schema:
          type: string
          enum: [newest, oldest, name_asc, name_desc]
          default: newest
        example: newest
    responses:
      '200':
        description: List of images retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                images:
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        type: string
                        description: The unique image ID (SHA256 hash)
                        example: "a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4"
                      name:
                        type: string
                        description: Original filename (without extension)
                        example: "sunset-beach"
                      url:
                        type: string
                        format: uri
                        description: Presigned S3 URL for the original image (valid for 1 hour)
                        example: "https://gara-images.s3.amazonaws.com/raw/a3b5c7d9...?X-Amz-Signature=..."
                      uploadedAt:
                        type: string
                        format: date-time
                        description: ISO 8601 timestamp of when the image was uploaded
                        example: "2025-11-17T14:30:00.000Z"
                      size:
                        type: integer
                        description: File size in bytes
                        example: 2458624
                      format:
                        type: string
                        description: Original image format
                        enum: [jpeg, jpg, png, gif, tiff, webp]
                        example: "jpeg"
                      width:
                        type: integer
                        description: Original image width in pixels
                        example: 1920
                      height:
                        type: integer
                        description: Original image height in pixels
                        example: 1080
                total:
                  type: integer
                  description: Total number of images available (for pagination)
                  example: 247
                limit:
                  type: integer
                  description: Maximum results returned in this response
                  example: 100
                offset:
                  type: integer
                  description: Number of results skipped
                  example: 0
            example:
              images:
                - id: "a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4"
                  name: "sunset-beach"
                  url: "https://gara-images.s3.amazonaws.com/raw/a3b5c7d9...?X-Amz-Signature=..."
                  uploadedAt: "2025-11-17T14:30:00.000Z"
                  size: 2458624
                  format: "jpeg"
                  width: 1920
                  height: 1080
                - id: "b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6"
                  name: "mountain-landscape"
                  url: "https://gara-images.s3.amazonaws.com/raw/b4c6d8e0...?X-Amz-Signature=..."
                  uploadedAt: "2025-11-17T15:45:00.000Z"
                  size: 3145728
                  format: "png"
                  width: 2560
                  height: 1440
              total: 247
              limit: 100
              offset: 0
      '500':
        description: Internal server error
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
                  example: "Failed to retrieve image list"
```

## Implementation Notes

### Backend Requirements

1. **Data Source**: Query S3 bucket to list all objects in the `raw/` prefix
2. **Metadata**: For each image, retrieve:
   - Image ID (from filename or metadata)
   - Original filename (stored in S3 metadata or database)
   - Upload timestamp (from S3 object metadata)
   - File size (from S3 object size)
   - Image dimensions (from S3 metadata if stored during upload)
   - Image format (from S3 object content-type or metadata)

3. **Presigned URLs**: Generate presigned S3 URLs for each image (1 hour expiration)

4. **Pagination**: Support limit/offset for efficient loading of large galleries

5. **Sorting**: Support sorting by upload date and name

### Response Format Compatibility

The response format matches the frontend's expected structure:

```typescript
interface ImageMetadata {
  id: string           // SHA256 hash
  name: string         // Filename without extension
  url: string          // Presigned S3 URL
  uploadedAt: string   // ISO 8601 timestamp
}
```

### Performance Considerations

- **Caching**: Consider caching the image list with a short TTL (30-60 seconds)
- **Pagination**: Default limit of 100 images to prevent large responses
- **Presigned URL Generation**: Batch generate presigned URLs to reduce latency
- **Database**: Consider maintaining an image index in a database rather than querying S3 directly for better performance

### Security Considerations

- **Authentication**: This endpoint may need authentication depending on use case
  - Public access for public galleries
  - API key or session-based auth for admin views
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **CORS**: Configure CORS headers to allow frontend domain

## Alternative Implementation (Database-Backed)

If the backend maintains an image database/index:

```sql
SELECT
  image_id,
  original_filename,
  upload_timestamp,
  file_size,
  image_format,
  width,
  height,
  s3_key
FROM images
ORDER BY upload_timestamp DESC
LIMIT ? OFFSET ?
```

This provides better performance than querying S3 directly.

## Frontend Integration

Once this endpoint is implemented, the frontend will update to:

```typescript
// app/api/images/route.ts
export async function GET(request: NextRequest) {
  const useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true'

  if (useLocalStorage) {
    // Use local file storage
    return await localFileStorage.listImages()
  } else {
    // Fetch from backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL
    const response = await fetch(`${backendUrl}/api/images`)
    const data = await response.json()
    return NextResponse.json(data)
  }
}
```

## Testing

### Sample Request

```bash
# List all images
curl -X GET "http://localhost:8080/api/images"

# With pagination
curl -X GET "http://localhost:8080/api/images?limit=50&offset=100"

# Sort by oldest first
curl -X GET "http://localhost:8080/api/images?sort=oldest"
```

### Sample Response

```json
{
  "images": [
    {
      "id": "a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4",
      "name": "sunset-beach",
      "url": "https://gara-images.s3.amazonaws.com/raw/a3b5c7d9...?X-Amz-Signature=...",
      "uploadedAt": "2025-11-17T14:30:00.000Z",
      "size": 2458624,
      "format": "jpeg",
      "width": 1920,
      "height": 1080
    }
  ],
  "total": 247,
  "limit": 100,
  "offset": 0
}
```

## Migration Path

1. Backend team implements `GET /api/images` endpoint
2. Frontend team updates image listing logic to support both local and backend modes
3. Deploy backend API changes
4. Deploy frontend changes with `USE_LOCAL_STORAGE` configuration
5. Test both modes:
   - Local mode: `USE_LOCAL_STORAGE=true`
   - Backend mode: `USE_LOCAL_STORAGE=false`

## Related Endpoints

- `POST /api/images/upload` - Upload new image (already implemented)
- `GET /api/images/{image_id}` - Get single image with transformations (already implemented)
- `GET /api/images` - **List all images (NEW - specified in this document)**

## Contact

For questions or clarifications about this specification, please contact the frontend team or create an issue in the project repository.
