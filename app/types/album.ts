export interface Album {
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

export interface AlbumWithImages extends Album {
  images: AlbumImage[]
}

export interface AlbumImage {
  id: string
  url: string
}

export interface CreateAlbumRequest {
  name: string
  description: string
  tags: string[]
  published: boolean
}

export interface UpdateAlbumRequest {
  name: string
  description: string
  cover_image_id: string
  tags: string[]
  published: boolean
}

export interface AddImagesRequest {
  image_ids: string[]
  position: number  // -1 for append
}

export interface ReorderImagesRequest {
  image_ids: string[]
}
