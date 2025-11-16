# Observability Guide

This document describes the logging, metrics, and monitoring infrastructure for the GARA Frontend application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Logging](#logging)
- [Metrics](#metrics)
- [Error Handling](#error-handling)
- [ECS Deployment](#ecs-deployment)
- [Development](#development)
- [Querying Logs and Metrics](#querying-logs-and-metrics)

## Overview

The application uses a comprehensive observability stack designed for AWS ECS:

- **Structured Logging**: Pino logger with JSON output to stdout
- **Metrics**: CloudWatch custom metrics for business and performance tracking
- **Error Tracking**: Centralized error handling with context
- **Request Tracing**: Unique request IDs for correlation
- **Log Aggregation**: ECS awslogs driver → CloudWatch Logs
- **Monitoring**: CloudWatch Container Insights for infrastructure metrics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GARA Frontend (ECS)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Pino       │─────▶│   stdout/    │─────▶│  awslogs  │ │
│  │   Logger     │      │   stderr     │      │  driver   │ │
│  └──────────────┘      └──────────────┘      └─────┬─────┘ │
│                                                      │       │
│  ┌──────────────┐                                   │       │
│  │  CloudWatch  │                                   │       │
│  │   Metrics    │───────────────────────────────────┼───────┤
│  │   Client     │                                   │       │
│  └──────────────┘                                   │       │
└──────────────────────────────────────────────────────┼───────┘
                                                       │
                           ┌───────────────────────────▼───────────────┐
                           │         AWS CloudWatch                    │
                           ├───────────────────────────────────────────┤
                           │  • CloudWatch Logs (/ecs/gara-frontend)  │
                           │  • Custom Metrics (GaraFrontend namespace)│
                           │  • Container Insights                     │
                           │  • Dashboards & Alarms                    │
                           └───────────────────────────────────────────┘
```

## Logging

### Logger Implementation

The application uses **Pino** for structured logging with the following features:

- **JSON output**: Machine-readable logs for CloudWatch Logs Insights
- **Log levels**: debug, info, warn, error, fatal
- **Automatic redaction**: Sensitive fields (passwords, tokens) removed
- **Browser support**: Fallback logger for client-side code
- **Request correlation**: Automatic request ID injection

### Log Levels

Configure via `LOG_LEVEL` environment variable:

| Level   | Use Case                                  | Production Default |
|---------|-------------------------------------------|--------------------|
| `debug` | Development, detailed troubleshooting     | No                 |
| `info`  | Normal operations, request completion     | **Yes**            |
| `warn`  | Recoverable errors, deprecated features   | Yes                |
| `error` | Errors requiring attention                | Yes                |
| `fatal` | Critical errors causing shutdown          | Yes                |

### Usage Examples

#### Server-Side (API Routes)

```typescript
import { getRequestLogger } from '@/lib/api'
import { handleApiError, trackOperation } from '@/lib/observability'

export async function GET(request: NextRequest) {
  const logger = getRequestLogger(request)

  try {
    logger.debug('Fetching data from backend')

    const data = await trackOperation('FetchData', async () => {
      // Your operation here
      return await fetchData()
    })

    logger.info('Data fetched successfully', { recordCount: data.length })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, {
      operation: 'GET /api/endpoint',
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
  "timestamp": "2025-11-16T10:30:45.123Z",
  "message": "Request completed",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "url": "/api/albums",
  "statusCode": 200,
  "duration": 145
}
```

## Metrics

### CloudWatch Custom Metrics

The application publishes custom metrics to CloudWatch in the `GaraFrontend` namespace.

#### Tracked Metrics

| Metric Name           | Type     | Dimensions                | Description                    |
|-----------------------|----------|---------------------------|--------------------------------|
| `ApiRequest`          | Duration | Method, StatusCode        | API request duration (ms)      |
| `ApiRequestCount`     | Count    | Method, StatusCode, Success| Number of API requests         |
| `Errors`              | Count    | Operation, ErrorType      | Error occurrences by type      |
| `ApiErrors`           | Count    | Operation, StatusCode     | API-specific errors            |
| `FetchAlbums`         | Duration | -                         | Album fetch operation time     |
| `FetchImagesFromS3`   | Duration | -                         | S3 image listing time          |
| `UploadImage`         | Duration | -                         | Image upload duration          |
| `ImageUploaded`       | Count    | FileType                  | Successful image uploads       |
| `UploadRejected`      | Count    | Reason                    | Rejected uploads (validation)  |
| `UploadFailed`        | Count    | -                         | Failed upload attempts         |

#### Usage Examples

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

### Metrics Buffering

Metrics are buffered and flushed to CloudWatch:

- **Buffer size**: 20 metrics (CloudWatch API limit)
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

## ECS Deployment

### Prerequisites

1. **IAM Roles**:
   - Task Execution Role: `ecsTaskExecutionRole` (for pulling images, reading secrets)
   - Task Role: `gara-frontend-task-role` (for CloudWatch metrics, logs)

2. **IAM Permissions** (Task Role):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "cloudwatch:PutMetricData"
         ],
         "Resource": "*"
       },
       {
         "Effect": "Allow",
         "Action": [
           "logs:CreateLogGroup",
           "logs:CreateLogStream",
           "logs:PutLogEvents"
         ],
         "Resource": "arn:aws:logs:*:*:log-group:/ecs/gara-frontend:*"
       }
     ]
   }
   ```

3. **CloudWatch Log Group** (auto-created by ECS):
   - Name: `/ecs/gara-frontend`
   - Retention: Set via AWS Console (recommended: 30 days)

### Task Definition Setup

Use the provided template: `ecs-task-definition.template.json`

**Key configuration:**

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/gara-frontend",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "frontend",
      "awslogs-create-group": "true"
    }
  }
}
```

### Environment Variables

Set in task definition:

```json
{
  "environment": [
    { "name": "LOG_LEVEL", "value": "info" },
    { "name": "ENABLE_METRICS", "value": "true" },
    { "name": "ENABLE_REQUEST_LOGGING", "value": "true" },
    { "name": "CLOUDWATCH_NAMESPACE", "value": "GaraFrontend" },
    { "name": "AWS_REGION", "value": "us-east-1" }
  ]
}
```

### Container Insights

Enable Container Insights on your ECS cluster:

```bash
aws ecs update-cluster-settings \
  --cluster your-cluster-name \
  --settings name=containerInsights,value=enabled
```

**Provides:**
- CPU and memory utilization
- Network I/O
- Disk I/O
- Task and service-level metrics

## Development

### Local Setup

1. **Copy environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Configure logging for development**:
   ```env
   LOG_LEVEL=debug
   ENABLE_METRICS=false
   ENABLE_REQUEST_LOGGING=true
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

### Pretty Logging in Development

Pino automatically enables pretty printing in development:

```
[10:30:45.123] INFO: Request completed
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    method: "GET"
    url: "/api/albums"
    duration: 145
```

### Testing

Logs are mocked in tests to prevent console noise:

```typescript
jest.spyOn(console, 'error').mockImplementation()
```

## Querying Logs and Metrics

### CloudWatch Logs Insights

Access via AWS Console → CloudWatch → Logs Insights

**Example Queries:**

1. **Find all errors in the last hour**:
   ```
   fields @timestamp, message, error.message, error.stack
   | filter level = "error"
   | sort @timestamp desc
   | limit 100
   ```

2. **Track API request durations**:
   ```
   fields @timestamp, message, duration, url, statusCode
   | filter message = "Request completed"
   | stats avg(duration), max(duration), count() by url
   ```

3. **Find slow requests (>1000ms)**:
   ```
   fields @timestamp, url, duration, method
   | filter duration > 1000
   | sort duration desc
   ```

4. **Error rate by operation**:
   ```
   fields @timestamp, operation
   | filter level = "error"
   | stats count() by operation
   ```

5. **Trace a specific request**:
   ```
   fields @timestamp, message, level
   | filter requestId = "550e8400-e29b-41d4-a716-446655440000"
   | sort @timestamp asc
   ```

### CloudWatch Metrics Console

Access via AWS Console → CloudWatch → Metrics → Custom Namespaces → GaraFrontend

**Useful Metric Queries:**

1. **API Request Rate**:
   - Metric: `ApiRequestCount`
   - Statistic: Sum
   - Period: 5 minutes

2. **Average Response Time**:
   - Metric: `ApiRequest`
   - Statistic: Average
   - Dimensions: Filter by Method or StatusCode

3. **Error Rate**:
   - Metric: `Errors`
   - Statistic: Sum
   - Group by: ErrorType dimension

4. **Upload Success Rate**:
   ```
   (ImageUploaded) / (ImageUploaded + UploadFailed) * 100
   ```

### Setting Up Alarms

**Example: High Error Rate Alarm**

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name gara-frontend-high-error-rate \
  --alarm-description "Alert when error rate exceeds threshold" \
  --metric-name Errors \
  --namespace GaraFrontend \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:YOUR_ACCOUNT:your-sns-topic
```

## Best Practices

### Do's

✅ Use structured logging with context objects
✅ Log at appropriate levels (debug for dev, info for production)
✅ Include request IDs in all logs
✅ Track business metrics (uploads, errors, latency)
✅ Set up CloudWatch alarms for critical errors
✅ Use CloudWatch Logs Insights for investigation
✅ Set log retention policies (30-90 days recommended)

### Don'ts

❌ Don't log sensitive data (passwords, tokens, PII)
❌ Don't use `console.log` directly (use logger)
❌ Don't log excessive debug info in production
❌ Don't ignore errors (always log and track)
❌ Don't forget to test logging in development

## Troubleshooting

### Logs not appearing in CloudWatch

1. Check ECS task role has CloudWatch Logs permissions
2. Verify `awslogs-create-group` is set to `"true"`
3. Check log group name matches: `/ecs/gara-frontend`
4. Ensure application is writing to stdout/stderr

### Metrics not showing in CloudWatch

1. Verify `ENABLE_METRICS=true` in environment
2. Check task role has `cloudwatch:PutMetricData` permission
3. Confirm `CLOUDWATCH_NAMESPACE` is set correctly
4. Wait 1-2 minutes for metrics to appear (buffering delay)

### High logging costs

1. Reduce `LOG_LEVEL` to `info` or `warn` in production
2. Set CloudWatch Logs retention to 30 days or less
3. Disable `ENABLE_REQUEST_LOGGING` for non-critical environments
4. Filter out noisy log entries

## Cost Optimization

**Estimated monthly costs** (us-east-1, typical small app):

| Service                     | Usage          | Cost/Month |
|-----------------------------|----------------|------------|
| CloudWatch Logs (ingestion) | 2-5 GB         | $1-3       |
| CloudWatch Logs (storage)   | 30-day retention| $0.50-1    |
| Container Insights          | 2 tasks        | $0.60      |
| Custom Metrics              | 20 metrics     | $3         |
| CloudWatch Alarms           | 5 alarms       | $0.50      |
| **Total**                   |                | **$6-9**   |

**Tips:**
- Use log sampling for high-traffic endpoints
- Aggregate metrics before publishing
- Use shorter retention for dev/staging environments

## Support

For issues or questions about observability:

1. Check CloudWatch Logs for error messages
2. Review metrics for anomalies
3. Consult this documentation
4. Check application logs for initialization errors

## References

- [Pino Documentation](https://getpino.io/)
- [AWS CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)
- [ECS Logging](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html)
- [Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html)
