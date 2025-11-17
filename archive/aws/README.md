# AWS Configuration Archive

This directory contains AWS-specific configuration files that were removed when migrating to local development.

## Files

- `ecs-task-definition.template.json` - ECS Fargate task definition for deploying to AWS

## Why These Were Archived

These files were moved here as part of the migration to remove AWS dependencies and enable local development. The application now runs locally without requiring AWS services like:

- S3 (replaced with local file storage)
- CloudWatch Metrics (replaced with console/file-based metrics)
- CloudWatch Logs (replaced with local stdout/file logging)
- ECS/Fargate (replaced with Docker Compose)
- Secrets Manager (replaced with .env files)

## If You Need AWS Deployment

If you need to deploy to AWS again in the future, you can:

1. Restore these configuration files to the project root
2. Reinstall AWS SDK dependencies:
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-cloudwatch
   ```
3. Update the code to use AWS services again (see git history for previous implementation)
4. Configure the appropriate environment variables and IAM roles

## Date Archived

This migration was performed on 2025-11-17.
