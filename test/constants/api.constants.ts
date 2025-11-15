/**
 * API endpoint constants for testing
 */
export const API_ENDPOINTS = {
  ALBUMS: '/api/albums',
  UPLOAD: '/api/upload',
  IMAGES: '/api/images',
} as const

/**
 * Base URLs for testing
 */
export const BASE_URLS = {
  FRONTEND: 'http://localhost:3000',
  BACKEND: 'http://localhost:8080',
} as const

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const
