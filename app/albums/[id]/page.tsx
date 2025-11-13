'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { AlbumWithImages } from '../../types/album'

export default function AlbumDetailPage() {
  const params = useParams()
  const albumId = params.id as string

  const [album, setAlbum] = useState<AlbumWithImages | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const fetchAlbum = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/albums/${albumId}`)
      if (!response.ok) throw new Error('Album not found')

      const data = await response.json()
      setAlbum(data)
    } catch (err) {
      setError('Failed to load album')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [albumId])

  useEffect(() => {
    fetchAlbum()
  }, [fetchAlbum])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading album...</p>
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || 'Album not found'}</p>
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
      {/* Album Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{album.name}</h1>
        {album.description && (
          <p className="text-gray-600 text-lg mb-4">{album.description}</p>
        )}
        {album.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {album.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-200 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {album.images.map((image, index) => (
          <div
            key={image.id}
            className="relative h-64 bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90"
            onClick={() => setSelectedImage(image.url)}
          >
            <Image
              src={image.url}
              alt={`${album.name} - Image ${index + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
            <Image
              src={selectedImage}
              alt="Full size"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
      </div>
    </main>
  )
}
