'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Album } from '../types/album'

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAlbums()
  }, [])

  const fetchAlbums = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/albums?published=true')
      if (!response.ok) throw new Error('Failed to fetch albums')

      const data = await response.json()
      setAlbums(data.albums || [])
    } catch (err) {
      setError('Failed to load albums')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading albums...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <nav className="bg-white border-b border-black">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <h1 className="text-xl tracking-wide">Photography Portfolio</h1>
          <div className="flex gap-4 items-center">
            <Link
              href="/"
              className="text-sm tracking-wide hover:underline"
            >
              Gallery
            </Link>
            <Link
              href="/albums"
              className="text-sm tracking-wide hover:underline"
            >
              Albums
            </Link>
            <Link
              href="/admin/login"
              className="border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm tracking-wide"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl mb-12 tracking-wide">Albums</h2>

      {albums.length === 0 ? (
        <p className="text-gray-500">No albums available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <Link
              key={album.album_id}
              href={`/albums/${album.album_id}`}
              className="group cursor-pointer"
            >
              <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
                {/* Cover Image */}
                {album.cover_image_id && (
                  <div className="relative h-64 bg-gray-200">
                    <Image
                      src={`/api/images/${album.cover_image_id}`}
                      alt={album.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}

                {/* Album Info */}
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600">
                    {album.name}
                  </h2>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {album.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{album.image_ids.length} images</span>
                    {album.tags.length > 0 && (
                      <span className="text-xs">
                        {album.tags.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </main>
  )
}
