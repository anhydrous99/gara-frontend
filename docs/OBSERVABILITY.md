# Observability Guide

This document describes the logging, metrics, and monitoring infrastructure for the GARA Frontend application running in local development environments.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Logging](#logging)
- [Metrics](#metrics)
- [Error Handling](#error-handling)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Best Practices](#best-practices)

## Overview

The application uses a flexible observability stack designed for local development:

- **Structured Logging**: Pino logger with JSON output to stdout
- **Metrics**: Console or file-based metrics for tracking performance and business events
- **Error Tracking**: Centralized error handling with context
- **Request Tracing**: Unique request IDs for correlation
- **Local Storage**: File-based image storage with no cloud dependencies

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GARA Frontend (Local)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Pino       │─────▶│   stdout/    │─────▶ Console       │
│  │   Logger     │      │   stderr     │                     │
│  └──────────────┘      └──────────────┘                     │
│                                                               │
│  ┌──────────────┐                                            │
│  │  Metrics     │─────▶ Console / File (logs/metrics.jsonl) │
│  │  Client      │                                            │
│  └──────────────┘                                            │
│                                                               │
│  ┌──────────────┐                                            │
│  │  Local File  │─────▶ public/uploads/                     │
│  │  Storage     │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

## Logging

### Logger Implementation

The application uses **Pino** for structured logging with the following features:

- **JSON output**: Machine-readable logs for parsing and analysis
- **Log levels**: debug, info, warn, error, fatal
- **Automatic redaction**: Sensitive fields (passwords, tokens) removed
- **Browser support**: Fallback logger for client-side code
- **Request correlation**: Automatic request ID injection
- **Pretty printing**: Color-coded output in development mode

### Log Levels

Configure via `LOG_LEVEL` environment variable:

| Level   | Use Case                                  | Development Default | Production Default |
|---------|-------------------------------------------|--------------------|-------------------|
| `debug` | Detailed troubleshooting, development     | **Yes**            | No                |
| `info`  | Normal operations, request completion     | Yes                | **Yes**           |
| `warn`  | Recoverable errors, deprecated features   | Yes                | Yes               |
| `error` | Errors requiring attention                | Yes                | Yes               |
| `fatal` | Critical errors causing shutdown          | Yes                | Yes               |

### Usage Examples

#### Server-Side (API Routes)

```typescript
import { getRequestLogger } from '@/lib/api'
import { handleApiError, trackOperation } from '@/lib/observability'

export async function GET(request: NextRequest) {
  const logger = getRequestLogger(request)

  try {
    logger.debug('Fetching images from local storage')

    const images = await trackOperation('FetchImages', async () => {
      return await localFileStorage.listImages()
    })

    logger.info('Images fetched successfully', { count: images.length })
    return NextResponse.json({ images })
  } catch (error) {
    return handleApiError(error, {
      operation: 'GET /api/images',
    })
  }
}
```

#### Client-Side

```typescript
import { logger } from '@/lib/observability'

function MyComponent() {
  const handleClick = () => {
    logger.debug('Button clicked', { buttonId: 'submit' })

    try {
      // Your logic
    } catch (error) {
      logger.error('Operation failed', error as Error, { userId: 'abc123' })
    }
  }
}
```

### Log Format

Logs are output as JSON with the following structure:

```json
{
  "level": "info",
  "timestamp": "2025-11-17T10:30:45.123Z",
  "message": "Request completed",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "url": "/api/images",
  "statusCode": 200,
  "duration": 145
}
```

### Development Mode Pretty Printing

In development, logs are automatically formatted for readability:

```
[10:30:45.123] INFO: Request completed
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    method: "GET"
    url: "/api/images"
    duration: 145
```

## Metrics

### Metrics Backends

The application supports multiple metrics backends, configured via `METRICS_BACKEND`:

| Backend    | Description                          | Use Case                        |
|------------|--------------------------------------|---------------------------------|
| `console`  | Logs metrics to stdout               | Development, debugging          |
| `file`     | Writes metrics to `logs/metrics.jsonl` | Local analysis, testing       |
| `disabled` | No metrics collection                | Minimal overhead environments   |

### Tracked Metrics

| Metric Name                  | Type     | Dimensions                | Description                    |
|-----------------------------|----------|---------------------------|--------------------------------|
| `ApiRequest`                | Duration | Method, StatusCode        | API request duration (ms)      |
| `ApiRequestCount`           | Count    | Method, StatusCode        | Number of API requests         |
| `Errors`                    | Count    | Operation, ErrorType      | Error occurrences by type      |
| `FetchImagesFromLocalStorage` | Duration | -                       | Image listing time             |
| `UploadImage`               | Duration | -                         | Image upload duration          |
| `ImageUploaded`             | Count    | FileType                  | Successful image uploads       |
| `UploadRejected`            | Count    | Reason                    | Rejected uploads (validation)  |
| `UploadFailed`              | Count    | -                         | Failed upload attempts         |

### Usage Examples

```typescript
import { metricsClient, trackOperation } from '@/lib/observability'

// Automatic timing and success/failure tracking
const result = await trackOperation('CustomOperation', async () => {
  return await performOperation()
})

// Manual metric tracking
await metricsClient.trackCount('CustomEvent', 1, [
  { name: 'Category', value: 'UserAction' },
])

await metricsClient.trackDuration('CustomDuration', 250, [
  { name: 'Operation', value: 'DataProcessing' },
])
```

### File-Based Metrics

When using `METRICS_BACKEND=file`, metrics are written to `logs/metrics.jsonl` as newline-delimited JSON:

```json
{"namespace":"GaraFrontend","timestamp":"2025-11-17T10:30:45.123Z","name":"ApiRequest","value":145,"unit":"Milliseconds","dimensions":[{"name":"Method","value":"GET"}]}
{"namespace":"GaraFrontend","timestamp":"2025-11-17T10:30:46.456Z","name":"ImageUploaded","value":1,"unit":"Count","dimensions":[{"name":"FileType","value":"image/jpeg"}]}
```

### Metrics Buffering

File-based metrics are buffered and flushed periodically:

- **Buffer size**: 100 metrics
- **Flush interval**: 60 seconds
- **Automatic flush**: On buffer full or application shutdown

## Error Handling

### Centralized Error Handler

All API routes use centralized error handling:

```typescript
import { handleApiError } from '@/lib/observability'

try {
  // Your code
} catch (error) {
  return handleApiError(error, {
    operation: 'MyOperation',
    customContext: 'value',
  })
}
```

**Features:**
- Automatic error logging with stack traces
- Context preservation (request ID, operation name)
- Metrics tracking (error rates by type)
- User-friendly error messages (hides internal details in production)

### Global Error Handlers

Registered automatically on server startup:

- **Unhandled Promise Rejections**: Logged and tracked
- **Uncaught Exceptions**: Logged with graceful shutdown
- **React Error Boundaries**: Available via `logReactError()`

## Local Development

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```

3. **Edit `.env.local`**:
   ```env
   # Local Storage
   USE_LOCAL_STORAGE=true
   UPLOADS_DIR=./public/uploads
   UPLOADS_PUBLIC_PATH=/uploads

   # Logging
   LOG_LEVEL=debug
   ENABLE_REQUEST_LOGGING=true

   # Metrics
   ENABLE_METRICS=true
   METRICS_BACKEND=console
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

### Using Docker Compose

```bash
# Run in development mode with hot reload
docker-compose -f docker-compose.dev.yml up

# Run in production mode
docker-compose up
```

### Viewing Metrics

#### Console Metrics

With `METRICS_BACKEND=console`, metrics appear in the console:

```
[DEBUG] Metric recorded
    namespace: "GaraFrontend"
    metric: "ApiRequest"
    value: 145
    unit: "Milliseconds"
    dimensions: "Method=GET"
```

#### File Metrics

With `METRICS_BACKEND=file`, analyze metrics with:

```bash
# View all metrics
cat logs/metrics.jsonl | jq

# Filter by metric name
cat logs/metrics.jsonl | jq 'select(.name == "ApiRequest")'

# Calculate average duration
cat logs/metrics.jsonl | jq -s 'map(select(.name == "ApiRequest")) | add / length'

# Count uploads by type
cat logs/metrics.jsonl | jq -s 'map(select(.name == "ImageUploaded")) | group_by(.dimensions[0].value) | map({type: .[0].dimensions[0].value, count: length})'
```

### Testing

Logs and metrics are mocked in tests:

```typescript
// Tests automatically use mocked observability
import { logger, metricsClient } from '@/lib/observability'

// Verify logging
expect(logger.info).toHaveBeenCalledWith(
  'Operation completed',
  expect.objectContaining({ count: 5 })
)

// Verify metrics
expect(metricsClient.trackCount).toHaveBeenCalledWith(
  'ImageUploaded',
  1,
  [{ name: 'FileType', value: 'image/jpeg' }]
)
```

## Production Deployment

### Environment Configuration

For production deployments, configure:

```env
# Application
NODE_ENV=production

# Storage
USE_LOCAL_STORAGE=true
UPLOADS_DIR=/app/public/uploads

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# Metrics
ENABLE_METRICS=true
METRICS_BACKEND=file
```

### Log Aggregation

For production, consider integrating with log aggregation services:

- **Self-hosted**: ELK Stack, Loki, Graylog
- **Cloud services**: Datadog, New Relic, Loggly
- **Container platforms**: Kubernetes with Fluentd, Docker logging drivers

### Persistent Storage

Ensure uploaded images and logs are persisted:

```yaml
# docker-compose.yml
volumes:
  - ./public/uploads:/app/public/uploads
  - ./logs:/app/logs
```

### Log Rotation

Implement log rotation to prevent disk space issues:

```bash
# Using logrotate
/app/logs/*.jsonl {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

## Best Practices

### Do's

✅ Use structured logging with context objects
✅ Log at appropriate levels (debug for dev, info for production)
✅ Include request IDs in all logs
✅ Track business metrics (uploads, errors, latency)
✅ Use file-based metrics for later analysis
✅ Monitor log files for errors and warnings
✅ Set up log rotation in production

### Don'ts

❌ Don't log sensitive data (passwords, tokens, PII)
❌ Don't use `console.log` directly (use logger)
❌ Don't log excessive debug info in production
❌ Don't ignore errors (always log and track)
❌ Don't forget to test logging in development
❌ Don't let log files grow unbounded

## Troubleshooting

### Logs not appearing

1. Check `LOG_LEVEL` is set appropriately
2. Verify logger is imported correctly
3. Check console output in development mode
4. Ensure stdout is not being redirected

### Metrics not being recorded

1. Verify `ENABLE_METRICS=true` in environment
2. Check `METRICS_BACKEND` is set to `console` or `file`
3. For file metrics, ensure `logs/` directory exists and is writable
4. Wait for buffer to flush (up to 60 seconds)

### High disk usage

1. Implement log rotation
2. Reduce `LOG_LEVEL` to `info` or `warn`
3. Disable `ENABLE_REQUEST_LOGGING` if not needed
4. Set up automated log cleanup

## Monitoring Examples

### Analyzing Logs with jq

```bash
# Find all errors in the last hour
cat logs/application.log | jq 'select(.level == "error")'

# Track API request durations
cat logs/application.log | jq 'select(.message == "Request completed") | {url, duration}' | jq -s 'group_by(.url) | map({url: .[0].url, avg: (map(.duration) | add / length)})'

# Count errors by type
cat logs/application.log | jq 'select(.level == "error") | .error.name' | sort | uniq -c
```

### Metrics Analysis

```bash
# Average upload duration
cat logs/metrics.jsonl | jq -s 'map(select(.name == "UploadImage")) | add / length'

# Upload success rate
cat logs/metrics.jsonl | jq -s 'group_by(.name) | map({metric: .[0].name, total: map(.value) | add})'
```

## Support

For issues or questions about observability:

1. Check logs in console or log files
2. Review metrics for anomalies
3. Consult this documentation
4. Check application startup logs for errors

## References

- [Pino Documentation](https://getpino.io/)
- [Structured Logging Best Practices](https://www.structlog.org/)
- [Application Monitoring](https://opentelemetry.io/)
- [Log Analysis with jq](https://stedolan.github.io/jq/)

---

**Note:** For AWS CloudWatch deployment, see `archive/aws/` directory for previous configuration.
