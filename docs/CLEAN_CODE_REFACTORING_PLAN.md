# Clean Code Refactoring Plan

## Overview

This document outlines a comprehensive plan to address all Clean Code issues identified in the audit of the gara-frontend project. The plan is organized into 6 phases, prioritized by impact and dependency order.

**Estimated Scope:** ~50 file modifications across 6 phases

---

## Phase 1: Foundation - Shared Utilities and Types

**Goal:** Eliminate duplication by creating shared utilities that other phases depend on.

**Priority:** HIGH (Blocking dependency for other phases)

### Task 1.1: Consolidate UUID Generation

**Problem:** UUID generation duplicated in `middleware.ts:12-18` and `lib/api/requestContext.ts:13-19`

**Solution:** Create single shared utility

**Files to create:**
```
lib/utils/uuid.ts
```

**Implementation:**
```typescript
// lib/utils/uuid.ts
/**
 * Generates a UUID v4 string
 * Uses Math.random() for Edge Runtime compatibility
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
```

**Files to modify:**
- `middleware.ts` - Import from `lib/utils/uuid`
- `lib/api/requestContext.ts` - Import from `lib/utils/uuid`

---

### Task 1.2: Create Shared API Configuration

**Problem:** `BACKEND_URL` and `API_KEY` constants repeated in 6 API route files

**Solution:** Centralize API configuration

**Files to create:**
```
lib/api/config.ts
```

**Implementation:**
```typescript
// lib/api/config.ts
/**
 * Backend API configuration
 * Centralized to ensure consistency across all API routes
 */

export const apiConfig = {
  backendUrl: process.env.NEXT_PUBLIC_API_URL || '',
  apiKey: process.env.GARA_API_KEY || '',
} as const

/**
 * Constructs full backend URL for an endpoint
 */
export function getBackendUrl(endpoint: string): string {
  const baseUrl = apiConfig.backendUrl.replace(/\/$/, '')
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${path}`
}

/**
 * Returns headers required for authenticated backend requests
 */
export function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiConfig.apiKey,
  }
}

/**
 * Returns headers for requests without body
 */
export function getApiKeyHeader(): Record<string, string> {
  return {
    'X-API-Key': apiConfig.apiKey,
  }
}
```

**Files to modify:**
- `lib/api/index.ts` - Re-export new config
- All 6 API route files (in Phase 3)

---

### Task 1.3: Unify Image Type Definitions

**Problem:** 4 similar Image interfaces defined across codebase

**Current locations:**
- `app/page.tsx:7` - `interface Image`
- `app/components/ImageGallery.tsx:6` - `interface GalleryImage`
- `app/admin/dashboard/page.tsx:9` - `interface UploadedImage`
- `app/types/album.ts:17` - `interface AlbumImage`

**Solution:** Create unified image types

**Files to create:**
```
app/types/image.ts
```

**Implementation:**
```typescript
// app/types/image.ts
/**
 * Base image interface with minimal required fields
 */
export interface BaseImage {
  id: string
  url: string
}

/**
 * Image with display metadata (name, upload date)
 * Used in galleries, listings, and admin views
 */
export interface ImageWithMetadata extends BaseImage {
  name: string
  uploadedAt: string
}

/**
 * Alias for backward compatibility with existing code
 * @deprecated Use ImageWithMetadata instead
 */
export type GalleryImage = ImageWithMetadata

/**
 * Image reference within an album context
 * Minimal data needed for album operations
 */
export interface AlbumImage extends BaseImage {}

/**
 * Full image data as returned from backend API
 */
export interface ApiImage extends ImageWithMetadata {
  size?: number
  mimeType?: string
}
```

**Files to modify:**
- `app/page.tsx` - Import `ImageWithMetadata`, remove local interface
- `app/components/ImageGallery.tsx` - Import `ImageWithMetadata`, remove `GalleryImage`
- `app/admin/dashboard/page.tsx` - Import `ImageWithMetadata`, remove `UploadedImage`
- `app/types/album.ts` - Import `AlbumImage` from image.ts, remove local definition

---

### Task 1.4: Create lib/utils/index.ts Barrel Export

**Files to create:**
```
lib/utils/index.ts
```

**Implementation:**
```typescript
// lib/utils/index.ts
export { generateUUID } from './uuid'
```

---

## Phase 2: API Route Infrastructure

**Goal:** Create reusable infrastructure for API routes to eliminate boilerplate and ensure consistency.

**Priority:** HIGH

### Task 2.1: Create Backend Fetch Utility

**Problem:** Each API route manually constructs fetch calls with repeated patterns

**Files to create:**
```
lib/api/backendFetch.ts
```

**Implementation:**
```typescript
// lib/api/backendFetch.ts
import { getBackendUrl, getAuthHeaders, getApiKeyHeader } from './config'
import { trackOperation } from '@/lib/observability'
import { ILogger } from '@/lib/observability/types'

export interface BackendFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  requiresAuth?: boolean
  operationName?: string
  logger?: ILogger
}

export interface BackendResponse<T> {
  ok: boolean
  status: number
  data?: T
  error?: unknown
}

/**
 * Fetches from backend API with consistent error handling and metrics
 */
export async function backendFetch<T>(
  endpoint: string,
  options: BackendFetchOptions = {}
): Promise<BackendResponse<T>> {
  const {
    method = 'GET',
    body,
    requiresAuth = false,
    operationName,
    logger,
  } = options

  const url = getBackendUrl(endpoint)
  const headers = requiresAuth ? getAuthHeaders() :
                  method !== 'GET' ? getApiKeyHeader() : {}

  const fetchOptions: RequestInit = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  }

  const doFetch = async () => {
    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      logger?.warn('Backend request failed', {
        url,
        method,
        statusCode: response.status,
      })

      let errorData: unknown
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: `Backend returned ${response.status}` }
      }

      return {
        ok: false,
        status: response.status,
        error: errorData,
      }
    }

    const data = await response.json()
    return {
      ok: true,
      status: response.status,
      data: data as T,
    }
  }

  if (operationName) {
    return trackOperation(operationName, doFetch)
  }

  return doFetch()
}
```

---

### Task 2.2: Create API Route Handler Wrapper

**Problem:** Every API route repeats auth checks, logging setup, error handling

**Files to create:**
```
lib/api/routeHandler.ts
```

**Implementation:**
```typescript
// lib/api/routeHandler.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import { getRequestLogger } from './requestContext'
import { handleApiError } from '@/lib/observability'
import { ILogger } from '@/lib/observability/types'

export interface RouteContext {
  request: NextRequest
  logger: ILogger
  params?: Record<string, string>
}

export interface AuthenticatedRouteContext extends RouteContext {
  session: Session
}

type RouteHandler<T, C extends RouteContext> = (context: C) => Promise<NextResponse<T>>

/**
 * Wraps a public API route handler with logging and error handling
 */
export function publicRoute<T>(
  operationName: string,
  handler: RouteHandler<T, RouteContext>
) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse<T>> => {
    const logger = getRequestLogger(request)

    try {
      return await handler({
        request,
        logger,
        params: context?.params,
      })
    } catch (error) {
      return handleApiError(error, {
        operation: operationName,
        ...context?.params,
      }) as NextResponse<T>
    }
  }
}

/**
 * Wraps an authenticated API route handler with auth, logging, and error handling
 */
export function authenticatedRoute<T>(
  operationName: string,
  handler: RouteHandler<T, AuthenticatedRouteContext>
) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse<T>> => {
    const logger = getRequestLogger(request)

    try {
      const session = await getServerSession()

      if (!session) {
        logger.warn(`Unauthorized ${operationName} attempt`, context?.params)
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ) as NextResponse<T>
      }

      return await handler({
        request,
        logger,
        session,
        params: context?.params,
      })
    } catch (error) {
      return handleApiError(error, {
        operation: operationName,
        ...context?.params,
      }) as NextResponse<T>
    }
  }
}
```

---

### Task 2.3: Update lib/api/index.ts Exports

**Implementation:**
```typescript
// lib/api/index.ts
/**
 * API utilities exports
 */

// Request context utilities
export {
  getRequestId,
  getClientIp,
  createRequestContext,
  getRequestLogger,
  logRequest,
  withRequestLogging,
} from './requestContext'

// API configuration
export {
  apiConfig,
  getBackendUrl,
  getAuthHeaders,
  getApiKeyHeader,
} from './config'

// Backend fetch utility
export {
  backendFetch,
  type BackendFetchOptions,
  type BackendResponse,
} from './backendFetch'

// Route handler wrappers
export {
  publicRoute,
  authenticatedRoute,
  type RouteContext,
  type AuthenticatedRouteContext,
} from './routeHandler'
```

---

## Phase 3: API Route Standardization

**Goal:** Refactor all API routes to use new infrastructure, ensuring consistent patterns.

**Priority:** HIGH

### Task 3.1: Refactor /api/albums/route.ts

**Before:** 101 lines with manual boilerplate
**After:** ~50 lines using route wrappers

**Implementation:**
```typescript
// app/api/albums/route.ts
import { NextResponse } from 'next/server'
import { publicRoute, authenticatedRoute, backendFetch } from '@/lib/api'

interface Album {
  album_id: string
  name: string
  // ... other fields
}

interface AlbumsResponse {
  albums: Album[]
}

// GET /api/albums?published=true
export const GET = publicRoute<AlbumsResponse>('GET /api/albums', async ({ request, logger }) => {
  const searchParams = request.nextUrl.searchParams
  const published = searchParams.get('published')

  const endpoint = published ? `/api/albums?published=${published}` : '/api/albums'

  logger.debug('Fetching albums from backend', { endpoint, published })

  const result = await backendFetch<AlbumsResponse>(endpoint, {
    operationName: 'FetchAlbums',
    logger,
  })

  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.status })
  }

  logger.info('Albums fetched successfully', { count: result.data?.albums?.length ?? 0 })

  return NextResponse.json(result.data!)
})

// POST /api/albums
export const POST = authenticatedRoute<Album>('POST /api/albums', async ({ request, logger }) => {
  const body = await request.json()

  logger.debug('Creating new album', { albumName: body.name })

  const result = await backendFetch<Album>('/api/albums', {
    method: 'POST',
    body,
    requiresAuth: true,
    operationName: 'CreateAlbum',
    logger,
  })

  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.status })
  }

  logger.info('Album created successfully', { albumId: result.data?.album_id })

  return NextResponse.json(result.data!, { status: 201 })
})
```

---

### Task 3.2: Refactor /api/albums/[id]/route.ts

Apply same pattern as Task 3.1

---

### Task 3.3: Refactor /api/albums/[id]/images/route.ts

**Critical:** This file currently lacks observability - add it during refactor

---

### Task 3.4: Refactor /api/albums/[id]/images/[imageId]/route.ts

**Critical:** This file currently lacks observability - add it during refactor

---

### Task 3.5: Refactor /api/albums/[id]/reorder/route.ts

Apply same pattern as Task 3.1

---

### Task 3.6: Refactor /api/images/route.ts

Apply same pattern as Task 3.1

---

### Task 3.7: Refactor /api/upload/route.ts

This route has additional validation logic - preserve while using wrappers

---

## Phase 4: Component Decomposition

**Goal:** Break down large page components into focused, testable units.

**Priority:** MEDIUM-HIGH

### Task 4.1: Create Admin Navigation Component

**Problem:** Navigation bar duplicated in 5 admin pages (~25 lines each = 125 lines total)

**Files to create:**
```
app/admin/components/AdminNav.tsx
```

**Implementation:**
```typescript
// app/admin/components/AdminNav.tsx
'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'

interface AdminNavProps {
  currentPage?: 'dashboard' | 'albums' | 'edit'
}

export function AdminNav({ currentPage }: AdminNavProps) {
  return (
    <nav className="bg-white border-b border-black">
      <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
        <h1 className="text-xl tracking-wide">Admin Dashboard</h1>
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="text-sm tracking-wide hover:opacity-60 transition-opacity"
          >
            View Portfolio
          </Link>
          <Link
            href="/admin/dashboard"
            className={`text-sm tracking-wide hover:opacity-60 transition-opacity ${
              currentPage === 'dashboard' ? 'underline' : ''
            }`}
          >
            Upload Images
          </Link>
          <Link
            href="/admin/albums"
            className={`text-sm tracking-wide hover:opacity-60 transition-opacity ${
              currentPage === 'albums' ? 'underline' : ''
            }`}
          >
            Manage Albums
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm tracking-wide"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
```

**Files to modify:**
- `app/admin/dashboard/page.tsx` - Use `AdminNav`
- `app/admin/albums/page.tsx` - Use `AdminNav`
- `app/admin/albums/create/page.tsx` - Use `AdminNav`
- `app/admin/albums/[id]/edit/page.tsx` - Use `AdminNav`

---

### Task 4.2: Create useAuth Hook

**Problem:** Auth redirect logic repeated in all admin pages

**Files to create:**
```
app/hooks/useAuth.ts
```

**Implementation:**
```typescript
// app/hooks/useAuth.ts
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface UseAuthOptions {
  redirectTo?: string
  redirectIfAuthenticated?: boolean
}

export function useAuth(options: UseAuthOptions = {}) {
  const { redirectTo = '/admin/login', redirectIfAuthenticated = false } = options
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!redirectIfAuthenticated && status === 'unauthenticated') {
      router.push(redirectTo)
    }

    if (redirectIfAuthenticated && status === 'authenticated') {
      router.push(redirectTo)
    }
  }, [status, router, redirectTo, redirectIfAuthenticated])

  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
  }
}
```

---

### Task 4.3: Create useAlbum Hook

**Problem:** Album fetching logic duplicated and mixed with UI

**Files to create:**
```
app/hooks/useAlbum.ts
```

**Implementation:**
```typescript
// app/hooks/useAlbum.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AlbumWithImages } from '@/app/types/album'

interface UseAlbumOptions {
  albumId: string
  autoFetch?: boolean
}

interface UseAlbumReturn {
  album: AlbumWithImages | null
  loading: boolean
  error: string | null
  fetchAlbum: () => Promise<void>
  updateAlbum: (data: Partial<AlbumWithImages>) => void
}

export function useAlbum({ albumId, autoFetch = true }: UseAlbumOptions): UseAlbumReturn {
  const [album, setAlbum] = useState<AlbumWithImages | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlbum = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/albums/${albumId}`)

      if (!response.ok) {
        throw new Error('Album not found')
      }

      const data = await response.json()
      setAlbum(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load album'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [albumId])

  const updateAlbum = useCallback((data: Partial<AlbumWithImages>) => {
    setAlbum(prev => prev ? { ...prev, ...data } : null)
  }, [])

  useEffect(() => {
    if (autoFetch) {
      fetchAlbum()
    }
  }, [autoFetch, fetchAlbum])

  return { album, loading, error, fetchAlbum, updateAlbum }
}
```

---

### Task 4.4: Create useAlbums Hook

**Files to create:**
```
app/hooks/useAlbums.ts
```

**Implementation:**
```typescript
// app/hooks/useAlbums.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Album } from '@/app/types/album'

interface UseAlbumsOptions {
  published?: boolean
  autoFetch?: boolean
}

export function useAlbums({ published, autoFetch = true }: UseAlbumsOptions = {}) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlbums = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const url = published !== undefined
        ? `/api/albums?published=${published}`
        : '/api/albums'

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch albums')
      }

      const data = await response.json()
      setAlbums(data.albums || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load albums'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [published])

  const deleteAlbum = useCallback(async (albumId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete album')
      }

      await fetchAlbums()
      return true
    } catch {
      return false
    }
  }, [fetchAlbums])

  useEffect(() => {
    if (autoFetch) {
      fetchAlbums()
    }
  }, [autoFetch, fetchAlbums])

  return { albums, loading, error, fetchAlbums, deleteAlbum }
}
```

---

### Task 4.5: Create hooks/index.ts Barrel Export

**Files to create:**
```
app/hooks/index.ts
```

**Implementation:**
```typescript
// app/hooks/index.ts
export { useAuth } from './useAuth'
export { useAlbum } from './useAlbum'
export { useAlbums } from './useAlbums'
```

---

### Task 4.6: Extract SortableImage Component

**Problem:** `SortableImage` defined inside `EditAlbumPage` (lines 28-95)

**Files to create:**
```
app/admin/components/SortableImage.tsx
```

**Implementation:**
```typescript
// app/admin/components/SortableImage.tsx
'use client'

import Image from 'next/image'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableImageProps {
  image: { id: string; url: string }
  isCover: boolean
  onSetCover: () => void
  onRemove: () => void
}

export function SortableImage({
  image,
  isCover,
  onSetCover,
  onRemove
}: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className="relative h-48 bg-gray-200 rounded-lg overflow-hidden cursor-move"
      >
        <Image
          src={image.url}
          alt={image.id}
          fill
          className="object-cover"
          unoptimized
        />
        {isCover && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
            Cover
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={onSetCover}
          className="px-2 py-1 bg-white text-xs rounded shadow hover:bg-gray-100"
          type="button"
        >
          Set Cover
        </button>
        <button
          onClick={onRemove}
          className="px-2 py-1 bg-red-600 text-white text-xs rounded shadow hover:bg-red-700"
          type="button"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
```

---

### Task 4.7: Create TagInput Component

**Files to create:**
```
app/admin/components/TagInput.tsx
```

**Implementation:**
```typescript
// app/admin/components/TagInput.tsx
'use client'

import { useState, KeyboardEvent } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
      setInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Tags</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a tag..."
        />
        <button
          type="button"
          onClick={addTag}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
```

---

### Task 4.8: Create admin/components/index.ts Barrel

**Files to create:**
```
app/admin/components/index.ts
```

**Implementation:**
```typescript
// app/admin/components/index.ts
export { AdminNav } from './AdminNav'
export { SortableImage } from './SortableImage'
export { TagInput } from './TagInput'
```

---

### Task 4.9: Refactor EditAlbumPage

**Goal:** Reduce from 438 lines to ~200 lines using extracted components and hooks

**Files to modify:**
```
app/admin/albums/[id]/edit/page.tsx
```

**Changes:**
- Import `AdminNav`, `SortableImage`, `TagInput` from `@/app/admin/components`
- Import `useAuth`, `useAlbum` from `@/app/hooks`
- Remove inline `SortableImage` component definition
- Replace manual auth check with `useAuth` hook
- Replace manual album fetching with `useAlbum` hook
- Replace inline tag handling with `TagInput` component

---

### Task 4.10: Refactor AdminAlbumsPage

**Files to modify:**
```
app/admin/albums/page.tsx
```

**Changes:**
- Import `AdminNav` from `@/app/admin/components`
- Import `useAuth`, `useAlbums` from `@/app/hooks`
- Remove manual auth and album fetching logic

---

### Task 4.11: Refactor DashboardPage

**Files to modify:**
```
app/admin/dashboard/page.tsx
```

**Changes:**
- Import `AdminNav` from `@/app/admin/components`
- Import `useAuth` from `@/app/hooks`
- Consider extracting `useImages` hook for image listing

---

## Phase 5: Error Handling Standardization

**Goal:** Ensure consistent error handling across all code.

**Priority:** MEDIUM

### Task 5.1: Fix `any` Type in Catch Blocks

**Problem:** 3 occurrences of `catch (err: any)`

**Files to modify:**
- `app/admin/albums/create/page.tsx:56`
- `app/admin/albums/[id]/edit/page.tsx:138`
- `app/admin/albums/[id]/edit/page.tsx:171`

**Fix pattern:**
```typescript
// Before
catch (err: any) {
  setError(err.message)
}

// After
catch (error) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  setError(message)
}
```

---

### Task 5.2: Create Client Error Handler Utility

**Files to create:**
```
lib/utils/clientError.ts
```

**Implementation:**
```typescript
// lib/utils/clientError.ts
/**
 * Extracts error message from unknown error type
 * Safe for use in catch blocks without type assertions
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return fallback
}

/**
 * Type guard to check if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error
}
```

---

### Task 5.3: Replace console.error with Structured Logging

**Problem:** 9 occurrences of `console.error` in client code

**Locations:**
- `app/page.tsx:28`
- `app/albums/page.tsx:27`
- `app/albums/[id]/page.tsx:28`
- `app/admin/dashboard/page.tsx:41`
- `app/admin/dashboard/page.tsx:90`
- `app/admin/albums/page.tsx:36`
- `app/admin/albums/page.tsx:56`
- `app/admin/albums/[id]/edit/page.tsx:199`

**Solution Options:**

Option A: Use `handleClientError` from observability (preferred)
```typescript
import { handleClientError } from '@/lib/observability'

// Before
console.error('Failed to fetch:', error)

// After
handleClientError(error, { operation: 'fetchImages' })
```

Option B: For minimal changes, keep console.error but add context
```typescript
// Acceptable for client-side where structured logging has less value
console.error('[ImageFetch] Failed to load images:', error)
```

---

### Task 5.4: Add Missing Observability to API Routes

**Problem:** Two API routes lack observability integration

**Files to modify:**
- `app/api/albums/[id]/images/route.ts` - Add logger, trackOperation, handleApiError
- `app/api/albums/[id]/images/[imageId]/route.ts` - Add logger, trackOperation, handleApiError

---

## Phase 6: Test Cleanup and Standardization

**Goal:** Standardize test patterns and remove duplication.

**Priority:** LOW-MEDIUM

### Task 6.1: Remove Duplicate Test File

**Problem:** `route.test.ts` and `route.refactored.test.ts` exist

**Action:**
1. Verify `route.refactored.test.ts` is complete
2. Delete `app/api/albums/__tests__/route.test.ts`
3. Rename `route.refactored.test.ts` to `route.test.ts`

---

### Task 6.2: Standardize All API Tests to Refactored Pattern

**Files to update:**
- `app/api/albums/[id]/__tests__/route.test.ts`
- `app/api/albums/[id]/images/__tests__/route.test.ts`
- `app/api/albums/[id]/images/[imageId]/__tests__/route.test.ts`
- `app/api/albums/[id]/reorder/__tests__/route.test.ts`
- `app/api/images/__tests__/route.test.ts`
- `app/api/upload/__tests__/route.test.ts`

**Changes:**
- Use test factories (`createMockAlbum`, `createAlbumData`)
- Use assertion helpers (`expectSuccess`, `expectUnauthorized`)
- Use fetch helpers (`mockSuccessfulBackendResponse`, `mockBackendError`)
- Use constants (`API_ENDPOINTS`, `HTTP_STATUS`, `ERROR_MESSAGES`)
- Follow AAA (Arrange-Act-Assert) pattern with comments

---

### Task 6.3: Add Tests for New Utilities

**Files to create:**
- `lib/api/__tests__/config.test.ts`
- `lib/api/__tests__/backendFetch.test.ts`
- `lib/api/__tests__/routeHandler.test.ts`
- `lib/utils/__tests__/uuid.test.ts`
- `lib/utils/__tests__/clientError.test.ts`
- `app/hooks/__tests__/useAuth.test.ts`
- `app/hooks/__tests__/useAlbum.test.ts`
- `app/hooks/__tests__/useAlbums.test.ts`
- `app/admin/components/__tests__/AdminNav.test.tsx`
- `app/admin/components/__tests__/TagInput.test.tsx`
- `app/admin/components/__tests__/SortableImage.test.tsx`

---

### Task 6.4: Remove Redundant Comments

**Files to review and clean:**
- All API routes - Remove "// Check authentication" style comments
- Keep meaningful comments that explain WHY, not WHAT

---

## Implementation Order

```
Phase 1: Foundation (MUST DO FIRST)
├── 1.1 UUID utility
├── 1.2 API config
├── 1.3 Image types
└── 1.4 Utils barrel

Phase 2: API Infrastructure (DEPENDS ON Phase 1)
├── 2.1 Backend fetch
├── 2.2 Route handlers
└── 2.3 API index updates

Phase 3: API Routes (DEPENDS ON Phase 2)
├── 3.1-3.7 Refactor all routes
└── (Can be done incrementally)

Phase 4: Components (DEPENDS ON Phase 1)
├── 4.1 AdminNav
├── 4.2-4.5 Hooks
├── 4.6-4.8 Extracted components
└── 4.9-4.11 Page refactors

Phase 5: Error Handling (INDEPENDENT)
├── 5.1 Fix any types
├── 5.2 Client error utility
├── 5.3 Replace console.error
└── 5.4 Add missing observability

Phase 6: Tests (SHOULD BE LAST)
├── 6.1 Remove duplicate
├── 6.2 Standardize patterns
├── 6.3 Add new tests
└── 6.4 Clean comments
```

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Duplicate UUID implementations | 2 | 1 |
| API config constant duplications | 6 | 1 |
| Image interface definitions | 4 | 1 (with extensions) |
| Lines in EditAlbumPage | 438 | <200 |
| API routes with observability | 4/6 | 6/6 |
| `catch (err: any)` occurrences | 3 | 0 |
| `console.error` in app code | 9 | 0 |
| Duplicated nav bar code | 5 files | 1 component |
| Test files with refactored pattern | 1 | All |

---

## Files Summary

### Files to Create (21 new files)
```
lib/utils/uuid.ts
lib/utils/clientError.ts
lib/utils/index.ts
lib/api/config.ts
lib/api/backendFetch.ts
lib/api/routeHandler.ts
app/types/image.ts
app/hooks/useAuth.ts
app/hooks/useAlbum.ts
app/hooks/useAlbums.ts
app/hooks/index.ts
app/admin/components/AdminNav.tsx
app/admin/components/SortableImage.tsx
app/admin/components/TagInput.tsx
app/admin/components/index.ts
lib/api/__tests__/config.test.ts
lib/api/__tests__/backendFetch.test.ts
lib/api/__tests__/routeHandler.test.ts
lib/utils/__tests__/uuid.test.ts
app/hooks/__tests__/useAuth.test.ts
app/admin/components/__tests__/AdminNav.test.tsx
```

### Files to Modify (~25 files)
```
middleware.ts
lib/api/requestContext.ts
lib/api/index.ts
app/types/album.ts
app/page.tsx
app/components/ImageGallery.tsx
app/api/albums/route.ts
app/api/albums/[id]/route.ts
app/api/albums/[id]/images/route.ts
app/api/albums/[id]/images/[imageId]/route.ts
app/api/albums/[id]/reorder/route.ts
app/api/images/route.ts
app/api/upload/route.ts
app/admin/dashboard/page.tsx
app/admin/albums/page.tsx
app/admin/albums/create/page.tsx
app/admin/albums/[id]/edit/page.tsx
app/albums/page.tsx
app/albums/[id]/page.tsx
+ Various test files
```

### Files to Delete (1 file)
```
app/api/albums/__tests__/route.test.ts (after migrating to refactored version)
```
