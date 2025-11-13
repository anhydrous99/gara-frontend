'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Album } from '../../types/album'

export default function AdminAlbumsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    } else if (status === 'authenticated') {
      fetchAlbums()
    }
  }, [status, router])

  const fetchAlbums = async () => {
    try {
      setLoading(true)
      // Fetch all albums (published and draft)
      const response = await fetch('/api/albums')
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

  const handleDelete = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this album?')) return

    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete album')

      // Refresh list
      await fetchAlbums()
    } catch (err) {
      alert('Failed to delete album')
      console.error(err)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Manage Albums</h1>
        <Link
          href="/admin/albums/create"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create New Album
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {albums.length === 0 ? (
        <p className="text-gray-500">No albums yet. Create your first album!</p>
      ) : (
        <div className="space-y-4">
          {albums.map((album) => (
            <div
              key={album.album_id}
              className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center"
            >
              <div>
                <h2 className="text-2xl font-semibold">{album.name}</h2>
                <p className="text-gray-600 text-sm mt-1">
                  {album.image_ids.length} images
                </p>
                <div className="flex gap-2 mt-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      album.published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {album.published ? 'Published' : 'Draft'}
                  </span>
                  {album.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/admin/albums/${album.album_id}/edit`}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(album.album_id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  )
}
