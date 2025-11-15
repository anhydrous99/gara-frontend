interface Album {
  album_id: string
  name: string
  description: string
  cover_image_id: string
  image_ids: string[]
  tags: string[]
  published: boolean
  created_at: number
  updated_at: number
}

interface CreateAlbumRequest {
  name: string
  description: string
  tags: string[]
  published: boolean
}

/**
 * Creates a mock album with optional overrides
 * @param overrides - Properties to override
 * @returns Mock album object
 * @example
 * const album = createMockAlbum({ name: 'My Album', published: true })
 */
export function createMockAlbum(overrides: Partial<Album> = {}): Album {
  const now = 1234567890 // Fixed timestamp for deterministic tests

  return {
    album_id: overrides.album_id ?? '1',
    name: overrides.name ?? 'Test Album',
    description: overrides.description ?? 'Test Description',
    cover_image_id: overrides.cover_image_id ?? 'img-1',
    image_ids: overrides.image_ids ?? ['img-1', 'img-2'],
    tags: overrides.tags ?? ['test'],
    published: overrides.published ?? true,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
  }
}

/**
 * Creates album request data
 * @param overrides - Properties to override
 * @returns Album request data
 */
export function createAlbumData(overrides: Partial<CreateAlbumRequest> = {}): CreateAlbumRequest {
  return {
    name: overrides.name ?? 'Test Album',
    description: overrides.description ?? '',
    tags: overrides.tags ?? [],
    published: overrides.published ?? false,
  }
}

/**
 * Creates multiple mock albums
 * @param count - Number of albums to create
 * @param overrides - Override function for each album
 */
export function createMockAlbums(
  count: number,
  overrides?: (index: number) => Partial<Album>
): Album[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAlbum(overrides?.(i) ?? { album_id: String(i + 1) })
  )
}
