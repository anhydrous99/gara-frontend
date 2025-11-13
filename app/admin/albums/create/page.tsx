'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CreateAlbumRequest } from '../../../types/album'

export default function CreateAlbumPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [formData, setFormData] = useState<CreateAlbumRequest>({
    name: '',
    description: '',
    tags: [],
    published: false
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/admin/login')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to create album')
      }

      const album = await response.json()
      // Redirect to edit page to add images
      router.push(`/admin/albums/${album.album_id}/edit`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag)
    })
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
            <Link href="/admin/dashboard" className="text-sm tracking-wide hover:opacity-60 transition-opacity">
              Upload Images
            </Link>
            <Link href="/admin/albums" className="text-sm tracking-wide hover:opacity-60 transition-opacity">
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

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h2 className="text-2xl mb-12 tracking-wide">Create New Album</h2>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Album Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Album Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="My Amazing Album"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Describe your album..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-2">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
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
            {formData.tags.map((tag) => (
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

        {/* Published Status */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="published"
            checked={formData.published}
            onChange={(e) =>
              setFormData({ ...formData, published: e.target.checked })
            }
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="published" className="ml-2 text-sm font-medium">
            Publish album (make visible to public)
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Album'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
      </div>
    </main>
  )
}
