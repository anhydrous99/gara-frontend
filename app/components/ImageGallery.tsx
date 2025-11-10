'use client'

import { useState } from 'react'
import Image from 'next/image'

interface GalleryImage {
  id: string
  name: string
  url: string
  uploadedAt: string
}

interface ImageGalleryProps {
  images: GalleryImage[]
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {images.map((image) => (
          <div
            key={image.id}
            className="cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            <div className="relative w-full h-64">
              <Image
                src={image.url}
                alt={image.name}
                fill
                className="object-cover transition-opacity hover:opacity-80"
                unoptimized
              />
            </div>
            <div className="pt-3">
              <h3 className="text-sm tracking-wide">{image.name}</h3>
              <p className="text-xs mt-1 opacity-60">
                {new Date(image.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black flex items-center justify-center z-50 p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-5xl w-full relative" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full" style={{ maxHeight: '80vh', aspectRatio: 'auto' }}>
              <Image
                src={selectedImage.url}
                alt={selectedImage.name}
                width={1920}
                height={1080}
                className="w-full h-auto max-h-[80vh] object-contain"
                unoptimized
              />
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white text-4xl leading-none hover:opacity-60 transition-opacity"
              aria-label="Close"
            >
              ×
            </button>
            <div className="mt-6 text-white">
              <h3 className="text-base tracking-wide">{selectedImage.name}</h3>
              <p className="text-sm mt-1 opacity-60">
                Uploaded: {new Date(selectedImage.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
