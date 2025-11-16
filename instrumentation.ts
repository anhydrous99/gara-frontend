/**
 * Next.js instrumentation file
 * This file runs once when the Next.js server starts
 * Perfect for initializing observability infrastructure
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize observability on server startup
    const { initializeObservability } = await import('./lib/observability')
    initializeObservability()
  }
}
