import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AlbumDetailPage from '../page'

// Mock useParams
jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ id: 'test-album-123' }))
}))

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { fill, unoptimized, priority, quality, ...rest } = props
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...rest} />
  }
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('AlbumDetailPage', () => {
  const mockAlbum = {
    album_id: 'test-album-123',
    name: 'Sunset Collection',
    description: 'Beautiful sunset photographs from around the world',
    tags: ['nature', 'sunset', 'landscape'],
    published: true,
    created_at: Date.now(),
    updated_at: Date.now(),
    images: [
      { id: '1', url: 'https://example.com/img1.jpg', caption: 'Sunset 1' },
      { id: '2', url: 'https://example.com/img2.jpg', caption: 'Sunset 2' },
      { id: '3', url: 'https://example.com/img3.jpg', caption: 'Sunset 3' }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Loading state', () => {
    it('should show loading message initially', () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      )

      render(<AlbumDetailPage />)

      expect(screen.getByText('Loading album...')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('should display error message on fetch failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load album')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to load album')).toHaveClass('text-red-500')
      consoleErrorSpy.mockRestore()
    })

    it('should display error when response is not ok', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load album')).toBeInTheDocument()
      })

      consoleErrorSpy.mockRestore()
    })

    it('should show "Album not found" when album is null', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => null
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Album not found')).toBeInTheDocument()
      })
    })
  })

  describe('Album display', () => {
    it('should fetch and display album successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sunset Collection')).toBeInTheDocument()
      })

      expect(screen.getByText('Beautiful sunset photographs from around the world')).toBeInTheDocument()
    })

    it('should call fetch with correct album ID', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/albums/test-album-123')
      })
    })

    it('should display all tags', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('nature')).toBeInTheDocument()
      })

      expect(screen.getByText('sunset')).toBeInTheDocument()
      expect(screen.getByText('landscape')).toBeInTheDocument()
    })

    it('should not display tags section when no tags', async () => {
      const albumWithoutTags = {
        ...mockAlbum,
        tags: []
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => albumWithoutTags
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sunset Collection')).toBeInTheDocument()
      })

      expect(screen.queryByText('nature')).not.toBeInTheDocument()
    })

    it('should not display description when not provided', async () => {
      const albumWithoutDescription = {
        ...mockAlbum,
        description: null
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => albumWithoutDescription
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sunset Collection')).toBeInTheDocument()
      })

      expect(screen.queryByText('Beautiful sunset photographs')).not.toBeInTheDocument()
    })

    it('should display all album images', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Sunset Collection - Image 1')).toBeInTheDocument()
      })

      expect(screen.getByAltText('Sunset Collection - Image 2')).toBeInTheDocument()
      expect(screen.getByAltText('Sunset Collection - Image 3')).toBeInTheDocument()
    })

    it('should set correct image sources', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        const img1 = screen.getByAltText('Sunset Collection - Image 1')
        expect(img1).toHaveAttribute('src', 'https://example.com/img1.jpg')
      })
    })
  })

  describe('Lightbox functionality', () => {
    it('should open lightbox when image is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Sunset Collection - Image 1')).toBeInTheDocument()
      })

      const imageContainer = screen.getByAltText('Sunset Collection - Image 1').parentElement!
      fireEvent.click(imageContainer)

      expect(screen.getByAltText('Full size')).toBeInTheDocument()
      expect(screen.getByAltText('Full size')).toHaveAttribute('src', 'https://example.com/img1.jpg')
    })

    it('should close lightbox when background is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Sunset Collection - Image 1')).toBeInTheDocument()
      })

      // Open lightbox
      const imageContainer = screen.getByAltText('Sunset Collection - Image 1').parentElement!
      fireEvent.click(imageContainer)

      expect(screen.getByAltText('Full size')).toBeInTheDocument()

      // Close lightbox
      const lightbox = screen.getByAltText('Full size').closest('.fixed')!
      fireEvent.click(lightbox)

      await waitFor(() => {
        expect(screen.queryByAltText('Full size')).not.toBeInTheDocument()
      })
    })

    it('should display different images in lightbox', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Sunset Collection - Image 2')).toBeInTheDocument()
      })

      const imageContainer = screen.getByAltText('Sunset Collection - Image 2').parentElement!
      fireEvent.click(imageContainer)

      expect(screen.getByAltText('Full size')).toHaveAttribute('src', 'https://example.com/img2.jpg')
    })

    it('should not show lightbox initially', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Sunset Collection - Image 1')).toBeInTheDocument()
      })

      expect(screen.queryByAltText('Full size')).not.toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should render navigation with correct links', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Photography Portfolio')).toBeInTheDocument()
      })

      expect(screen.getByText('Gallery')).toBeInTheDocument()
      expect(screen.getByText('Albums')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })

    it('should have correct href for navigation links', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        const links = screen.getAllByRole('link')
        const galleryLink = links.find(link => link.textContent === 'Gallery')
        const albumsLink = links.find(link => link.textContent === 'Albums')
        const adminLink = links.find(link => link.textContent === 'Admin')

        expect(galleryLink).toHaveAttribute('href', '/')
        expect(albumsLink).toHaveAttribute('href', '/albums')
        expect(adminLink).toHaveAttribute('href', '/admin/login')
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle album with empty images array', async () => {
      const albumWithoutImages = {
        ...mockAlbum,
        images: []
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => albumWithoutImages
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sunset Collection')).toBeInTheDocument()
      })

      expect(screen.queryByAltText(/Sunset Collection - Image/)).not.toBeInTheDocument()
    })

    it('should handle single image album', async () => {
      const singleImageAlbum = {
        ...mockAlbum,
        images: [mockAlbum.images[0]]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => singleImageAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Sunset Collection - Image 1')).toBeInTheDocument()
      })

      expect(screen.queryByAltText('Sunset Collection - Image 2')).not.toBeInTheDocument()
    })

    it('should handle album with long name', async () => {
      const longNameAlbum = {
        ...mockAlbum,
        name: 'A Very Long Album Name That Contains Many Words And Describes The Collection In Great Detail'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => longNameAlbum
      })

      render(<AlbumDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/A Very Long Album Name/)).toBeInTheDocument()
      })
    })
  })
})
