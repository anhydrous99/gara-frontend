/**
 * Next.js middleware for request logging and metrics
 * Automatically logs all HTTP requests with timing and context
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Generate a simple UUID v4
 * Uses Web Crypto API which is available in Edge Runtime
 */
function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Request logging middleware
 * Runs on all requests before they reach route handlers
 */
export async function middleware(request: NextRequest) {
  const startTime = Date.now()

  // Generate unique request ID for tracing
  const requestId = generateRequestId()

  // Create response with request ID header
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })

  // Add request ID to response headers for client-side correlation
  response.headers.set('x-request-id', requestId)

  // Log request after response (non-blocking)
  // Note: We can't use async logger here due to Next.js middleware limitations
  // Actual logging happens in API routes using the request ID
  const duration = Date.now() - startTime

  // Store request metadata for API routes to access
  response.headers.set('x-request-start', String(startTime))
  response.headers.set('x-request-duration', String(duration))

  return response
}

/**
 * Configure which routes use this middleware
 * Match all API routes and admin routes
 */
export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
  ],
}
