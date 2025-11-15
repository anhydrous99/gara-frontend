import { render, screen, waitFor } from '@testing-library/react'
import AlbumsPage from '../page'

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

describe('AlbumsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Loading state', () => {
    it('should show loading message initially', () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      )

      render(<AlbumsPage />)

      expect(screen.getByText('Loading albums...')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('should display error message on fetch failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load albums')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to load albums')).toHaveClass('text-red-500')
      consoleErrorSpy.mockRestore()
    })

    it('should display error when response is not ok', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load albums')).toBeInTheDocument()
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Empty state', () => {
    it('should show empty message when no albums exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('No albums available.')).toBeInTheDocument()
      })
    })

    it('should show empty message when albums is null', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('No albums available.')).toBeInTheDocument()
      })
    })
  })

  describe('Albums display', () => {
    const mockAlbums = [
      {
        album_id: '1',
        name: 'Nature Collection',
        description: 'Beautiful nature photos',
        cover_image_id: 'img1',
        image_ids: ['img1', 'img2', 'img3'],
        tags: ['nature', 'landscape'],
        published: true,
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        album_id: '2',
        name: 'Urban Photography',
        description: 'City life and architecture',
        cover_image_id: 'img4',
        image_ids: ['img4', 'img5'],
        tags: ['urban', 'architecture'],
        published: true,
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ]

    it('should fetch and display albums successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('Nature Collection')).toBeInTheDocument()
      })

      expect(screen.getByText('Urban Photography')).toBeInTheDocument()
      expect(screen.getByText('Beautiful nature photos')).toBeInTheDocument()
      expect(screen.getByText('City life and architecture')).toBeInTheDocument()
    })

    it('should call fetch with correct endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/albums?published=true')
      })
    })

    it('should display image count for each album', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('3 images')).toBeInTheDocument()
      })

      expect(screen.getByText('2 images')).toBeInTheDocument()
    })

    it('should display album tags', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('nature, landscape')).toBeInTheDocument()
      })

      expect(screen.getByText('urban, architecture')).toBeInTheDocument()
    })

    it('should render cover images with correct attributes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Nature Collection')).toBeInTheDocument()
      })

      const img1 = screen.getByAltText('Nature Collection')
      expect(img1).toHaveAttribute('src', '/api/images/img1')

      const img2 = screen.getByAltText('Urban Photography')
      expect(img2).toHaveAttribute('src', '/api/images/img4')
    })

    it('should create links to individual album pages', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        const links = screen.getAllByRole('link')
        const albumLinks = links.filter(link => link.getAttribute('href')?.startsWith('/albums/'))
        expect(albumLinks).toHaveLength(2)
        expect(albumLinks[0]).toHaveAttribute('href', '/albums/1')
        expect(albumLinks[1]).toHaveAttribute('href', '/albums/2')
      })
    })

    it('should handle album without cover image', async () => {
      const albumsWithoutCover = [
        {
          ...mockAlbums[0],
          cover_image_id: null
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: albumsWithoutCover })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('Nature Collection')).toBeInTheDocument()
      })

      expect(screen.queryByAltText('Nature Collection')).not.toBeInTheDocument()
    })

    it('should handle album with no tags', async () => {
      const albumsWithoutTags = [
        {
          ...mockAlbums[0],
          tags: []
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: albumsWithoutTags })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('Nature Collection')).toBeInTheDocument()
      })

      expect(screen.queryByText(/nature, landscape/)).not.toBeInTheDocument()
    })

    it('should limit tags display to first 2 tags', async () => {
      const albumWithManyTags = [
        {
          ...mockAlbums[0],
          tags: ['tag1', 'tag2', 'tag3', 'tag4']
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: albumWithManyTags })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('tag1, tag2')).toBeInTheDocument()
      })

      expect(screen.queryByText('tag3')).not.toBeInTheDocument()
      expect(screen.queryByText('tag4')).not.toBeInTheDocument()
    })

    it('should display single album correctly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [mockAlbums[0]] })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('Nature Collection')).toBeInTheDocument()
      })

      expect(screen.queryByText('Urban Photography')).not.toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should render navigation with correct links', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.getByText('Photography Portfolio')).toBeInTheDocument()
      })

      expect(screen.getByText('Gallery')).toBeInTheDocument()
      expect(screen.getAllByText('Albums')).toHaveLength(2) // Nav link + heading
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })

    it('should have correct href for navigation links', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] })
      })

      render(<AlbumsPage />)

      await waitFor(() => {
        const links = screen.getAllByRole('link')
        const galleryLink = links.find(link => link.textContent === 'Gallery')
        const adminLink = links.find(link => link.textContent === 'Admin')

        expect(galleryLink).toHaveAttribute('href', '/')
        expect(adminLink).toHaveAttribute('href', '/admin/login')
      })
    })
  })

  describe('Styling', () => {
    it('should have correct CSS classes for main container', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] })
      })

      const { container } = render(<AlbumsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading albums...')).not.toBeInTheDocument()
      })

      const main = container.querySelector('main')
      expect(main).toHaveClass('min-h-screen', 'bg-white')
    })
  })
})
