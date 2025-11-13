'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { AlbumWithImages, UpdateAlbumRequest } from '../../../../types/album'

// Sortable Image Component
function SortableImage({
  image,
  isCover,
  onSetCover,
  onRemove
}: {
  image: { id: string; url: string }
  isCover: boolean
  onSetCover: () => void
  onRemove: () => void
}) {
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
        >
          Set Cover
        </button>
        <button
          onClick={onRemove}
          className="px-2 py-1 bg-red-600 text-white text-xs rounded shadow hover:bg-red-700"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

export default function EditAlbumPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const albumId = params.id as string

  const [album, setAlbum] = useState<AlbumWithImages | null>(null)
  const [formData, setFormData] = useState<UpdateAlbumRequest>({
    name: '',
    description: '',
    cover_image_id: '',
    tags: [],
    published: false
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const fetchAlbum = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/albums/${albumId}`)
      if (!response.ok) throw new Error('Album not found')

      const data = await response.json()
      setAlbum(data)
      setFormData({
        name: data.name,
        description: data.description,
        cover_image_id: data.cover_image_id,
        tags: data.tags,
        published: data.published
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [albumId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    } else if (status === 'authenticated') {
      fetchAlbum()
    }
  }, [status, albumId, router, fetchAlbum])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to update album')
      }

      router.push('/admin/albums')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && album) {
      const oldIndex = album.images.findIndex((img) => img.id === active.id)
      const newIndex = album.images.findIndex((img) => img.id === over.id)

      const newImages = arrayMove(album.images, oldIndex, newIndex)
      const newImageIds = newImages.map((img) => img.id)

      // Optimistic update
      setAlbum({ ...album, images: newImages, image_ids: newImageIds })

      // Save to backend
      try {
        await fetch(`/api/albums/${albumId}/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_ids: newImageIds })
        })
      } catch (err) {
        console.error('Failed to reorder images:', err)
        // Revert on error
        fetchAlbum()
      }
    }
  }

  const handleRemoveImage = async (imageId: string) => {
    if (!confirm('Remove this image from the album?')) return

    try {
      await fetch(`/api/albums/${albumId}/images/${imageId}`, {
        method: 'DELETE'
      })
      await fetchAlbum()
    } catch (err) {
      alert('Failed to remove image')
    }
  }

  const handleSetCover = async (imageId: string) => {
    setFormData({ ...formData, cover_image_id: imageId })
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
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

      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl mb-12 tracking-wide">Edit Album</h2>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Metadata Section */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
          <h2 className="text-2xl font-semibold">Album Details</h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Album Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                onKeyPress={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addTag())
                }
                className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Published */}
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
              Publish album
            </label>
          </div>
        </div>

        {/* Images Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Images ({album.images.length})
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Drag images to reorder. Click &quot;Set Cover&quot; to choose the album cover.
          </p>

          {album.images.length === 0 ? (
            <p className="text-gray-500">
              No images in this album. Add images from the dashboard.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={album.images.map((img) => img.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {album.images.map((image) => (
                    <SortableImage
                      key={image.id}
                      image={image}
                      isCover={image.id === formData.cover_image_id}
                      onSetCover={() => handleSetCover(image.id)}
                      onRemove={() => handleRemoveImage(image.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/albums')}
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
