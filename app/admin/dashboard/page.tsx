'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FormEvent, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface UploadedImage {
  id: string
  name: string
  url: string
  uploadedAt: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    // Fetch uploaded images
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/images')
        if (response.ok) {
          const data = await response.json()
          setImages(data.images || [])
        }
      } catch (err) {
        console.error('Failed to fetch images:', err)
      }
    }

    if (session) {
      fetchImages()
    }
  }, [session])

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Please select an image')
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Upload failed')
      } else {
        setSuccess('Image uploaded successfully!')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // Refresh images list
        const imagesResponse = await fetch('/api/images')
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json()
          setImages(imagesData.images || [])
        }
      }
    } catch (err) {
      setError('An error occurred during upload')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <main className="min-h-screen bg-white">
      <nav className="bg-white border-b border-black">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <h1 className="text-xl tracking-wide">Admin Dashboard</h1>
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-sm tracking-wide hover:opacity-60 transition-opacity">
              View Portfolio
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

      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl mb-12 tracking-wide">Upload Images</h2>

        <div className="mb-16">
          <form onSubmit={handleUpload} className="space-y-8">
            <div className="border border-dashed border-black p-12 text-center hover:bg-black hover:text-white transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                id="file-input"
                disabled={loading}
              />
              <label htmlFor="file-input" className="cursor-pointer block">
                <p className="text-base mb-2 tracking-wide">
                  Click to select an image
                </p>
                <p className="text-xs opacity-60">
                  PNG, JPG, GIF up to 50MB
                </p>
              </label>
            </div>

            {error && (
              <div className="text-sm text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-center">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full border border-black px-4 py-3 hover:bg-black hover:text-white disabled:opacity-30 transition-colors tracking-wide"
            >
              {loading ? 'Uploading...' : 'Upload Image'}
            </button>
          </form>
        </div>

        <h3 className="text-xl mb-8 tracking-wide">Your Images</h3>
        {images.length === 0 ? (
          <div className="text-center py-16">
            No images uploaded yet. Upload your first photo above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {images.map((image) => (
              <div key={image.id}>
                <div className="relative w-full h-48">
                  <Image
                    src={image.url}
                    alt={image.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="pt-3">
                  <h4 className="text-sm tracking-wide truncate">{image.name}</h4>
                  <p className="text-xs mt-1 opacity-60">
                    {new Date(image.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
