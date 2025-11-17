# Backend API Specification

## Overview

This directory contains the OpenAPI specification for the backend API endpoint required to support image listing functionality in the GARA frontend.

## Files

- **`backend-api-spec.yaml`** - OpenAPI 3.0 specification for the `GET /api/images` endpoint

## Required Endpoint

### GET /api/images

Lists all uploaded images with metadata and presigned S3 URLs.

**Purpose**: Enable the frontend to display a gallery of all available images when using backend-based storage (`USE_LOCAL_STORAGE=false`).

## Using the Specification

### View in Swagger UI

```bash
# Using Docker
docker run -p 8081:8080 -e SWAGGER_JSON=/spec/backend-api-spec.yaml -v $(pwd)/docs:/spec swaggerapi/swagger-ui

# Open http://localhost:8081
```

### Generate Server Code

```bash
# Using OpenAPI Generator
npx @openapitools/openapi-generator-cli generate \
  -i docs/backend-api-spec.yaml \
  -g go-server \
  -o backend/generated

# Or for other languages
npx @openapitools/openapi-generator-cli generate \
  -i docs/backend-api-spec.yaml \
  -g python-flask \
  -o backend/generated
```

### Validate the Specification

```bash
# Using openapi-cli
npm install -g @redocly/openapi-cli
openapi lint docs/backend-api-spec.yaml
```

## Implementation Requirements

### Data Source

Query S3 bucket to list all objects with prefix `raw/`:

```python
# Example with boto3 (Python)
s3 = boto3.client('s3')
response = s3.list_objects_v2(
    Bucket='gara-images',
    Prefix='raw/'
)
```

### Generate Presigned URLs

For each image, generate a presigned URL (1 hour expiration):

```python
url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'gara-images', 'Key': object_key},
    ExpiresIn=3600
)
```

### Metadata Retrieval

Image metadata can be stored in:
1. **S3 Object Metadata** - Set during upload
2. **Database** - Separate index for better performance
3. **DynamoDB** - AWS-native key-value store

Recommended approach: Database-backed for better query performance.

### Response Format

Must match the schema defined in the OpenAPI spec:

```json
{
  "images": [
    {
      "id": "a3b5c7d9...",
      "name": "sunset-beach",
      "url": "https://...presigned-url...",
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

## Performance Considerations

### Caching

Implement short-lived caching (30-60 seconds) to reduce S3 API calls:

```
Cache-Control: public, max-age=60
```

### Pagination

Default limit of 100 images prevents large response payloads:

```
GET /api/images?limit=50&offset=100
```

### Database Index

For production deployments with many images, maintain a database index:

```sql
CREATE TABLE images (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255),
  s3_key VARCHAR(512),
  uploaded_at TIMESTAMP,
  size BIGINT,
  format VARCHAR(10),
  width INTEGER,
  height INTEGER
);

CREATE INDEX idx_uploaded_at ON images(uploaded_at DESC);
```

## Security

### Authentication

Consider adding authentication if needed:

```yaml
security:
  - ApiKeyAuth: []
  - BearerAuth: []
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1637164800
```

### CORS

Configure CORS headers for frontend domain:

```
Access-Control-Allow-Origin: https://your-frontend-domain.com
Access-Control-Allow-Methods: GET
Access-Control-Max-Age: 3600
```

## Testing

### Sample Request

```bash
# List all images
curl http://localhost:8080/api/images

# With pagination
curl "http://localhost:8080/api/images?limit=50&offset=100"

# Sort by oldest first
curl "http://localhost:8080/api/images?sort=oldest"
```

### Expected Response

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

## Integration with Frontend

Once implemented, the frontend will automatically use this endpoint when configured with:

```env
USE_LOCAL_STORAGE=false
NEXT_PUBLIC_API_URL=http://localhost:8080
```

The frontend already includes the integration logic in `app/api/images/route.ts`.

## Related API Endpoints

- `POST /api/images/upload` - Upload new image ✅ Already implemented
- `GET /api/images/{image_id}` - Get single image with transformations ✅ Already implemented
- `GET /api/images` - List all images ⏳ Specified in this document

## Questions or Issues

For questions about this specification, please:
1. Review the OpenAPI spec: `docs/backend-api-spec.yaml`
2. Open an issue in the repository
3. Contact the frontend team

## References

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger Editor](https://editor.swagger.io/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
