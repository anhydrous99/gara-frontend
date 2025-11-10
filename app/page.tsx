'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ImageGallery from '@/app/components/ImageGallery'

interface Image {
  id: string
  name: string
  url: string
  uploadedAt: string
}

export default function Home() {
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch images from API
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/images')
        if (response.ok) {
          const data = await response.json()
          setImages(data.images || [])
        }
      } catch (error) {
        console.error('Failed to fetch images:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [])

  return (
    <main className="min-h-screen bg-white">
      <nav className="bg-white border-b border-black">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <h1 className="text-xl tracking-wide">Photography Portfolio</h1>
          <Link
            href="/admin/login"
            className="border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors text-sm tracking-wide"
          >
            Admin
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl mb-12 tracking-wide">Gallery</h2>

        {loading ? (
          <div className="text-center py-16">Loading images...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-16">
            No images yet. Visit the admin panel to upload your first photo.
          </div>
        ) : (
          <ImageGallery images={images} />
        )}
      </div>
    </main>
  )
}
