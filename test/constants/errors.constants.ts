/**
 * Error messages used in the application
 * Keep in sync with actual error messages
 */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  FETCH_ALBUMS_FAILED: 'Internal server error', // Changed: backend errors now return generic message for security
  ALBUM_NOT_FOUND: 'Album not found',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  NO_FILE_PROVIDED: 'No file provided',
  FILE_TOO_LARGE: 'File too large',
  INVALID_FILE_TYPE: 'Invalid file type',
} as const
