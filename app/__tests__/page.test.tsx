import { render, screen, waitFor } from '@testing-library/react'
import Home from '../page'

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

// Mock ImageGallery component
jest.mock('@/app/components/ImageGallery', () => ({
  __esModule: true,
  default: ({ images }: { images: any[] }) => (
    <div data-testid="image-gallery">
      {images.map((img) => (
        <div key={img.id} data-testid={`image-${img.id}`}>
          {img.name}
        </div>
      ))}
    </div>
  )
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Navigation', () => {
    it('should render navigation with correct links', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] })
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.queryByText('Loading images...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Photography Portfolio')).toBeInTheDocument()
      expect(screen.getAllByText('Gallery')).toHaveLength(2) // Nav link + heading
      expect(screen.getByText('Albums')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()

      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(3)
      expect(links[0]).toHaveAttribute('href', '/')
      expect(links[1]).toHaveAttribute('href', '/albums')
      expect(links[2]).toHaveAttribute('href', '/admin/login')
    })

    it('should render page title', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] })
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.queryByText('Loading images...')).not.toBeInTheDocument()
      })

      expect(screen.getByRole('heading', { name: /Gallery/i })).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should show loading state initially', () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      )

      render(<Home />)

      expect(screen.getByText('Loading images...')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('should display empty message when no images exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] })
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText(/No images yet/i)).toBeInTheDocument()
      })

      expect(screen.getByText(/Visit the admin panel to upload your first photo/i)).toBeInTheDocument()
    })

    it('should display empty message when images array is null', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText(/No images yet/i)).toBeInTheDocument()
      })
    })
  })

  describe('Images display', () => {
    it('should fetch and display images successfully', async () => {
      const mockImages = [
        { id: '1', name: 'Image 1', url: 'https://example.com/1.jpg', uploadedAt: '2024-01-01' },
        { id: '2', name: 'Image 2', url: 'https://example.com/2.jpg', uploadedAt: '2024-01-02' },
        { id: '3', name: 'Image 3', url: 'https://example.com/3.jpg', uploadedAt: '2024-01-03' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: mockImages })
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('image-gallery')).toBeInTheDocument()
      })

      expect(screen.getByTestId('image-1')).toBeInTheDocument()
      expect(screen.getByTestId('image-2')).toBeInTheDocument()
      expect(screen.getByTestId('image-3')).toBeInTheDocument()
      expect(screen.queryByText('Loading images...')).not.toBeInTheDocument()
    })

    it('should call fetch with correct endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] })
      })

      render(<Home />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/images')
      })
    })

    it('should display single image', async () => {
      const mockImage = [
        { id: '1', name: 'Single Image', url: 'https://example.com/1.jpg', uploadedAt: '2024-01-01' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: mockImage })
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('image-gallery')).toBeInTheDocument()
      })

      expect(screen.getByTestId('image-1')).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<Home />)

      await waitFor(() => {
        expect(screen.queryByText('Loading images...')).not.toBeInTheDocument()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch images:', expect.any(Error))
      expect(screen.getByText(/No images yet/i)).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-ok response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.queryByText('Loading images...')).not.toBeInTheDocument()
      })

      expect(screen.getByText(/No images yet/i)).toBeInTheDocument()
    })

    it('should handle malformed response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.queryByText('Loading images...')).not.toBeInTheDocument()
      })

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(screen.getByText(/No images yet/i)).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Styling and layout', () => {
    it('should have correct CSS classes for main container', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] })
      })

      const { container } = render(<Home />)

      await waitFor(() => {
        expect(screen.queryByText('Loading images...')).not.toBeInTheDocument()
      })

      const main = container.querySelector('main')
      expect(main).toHaveClass('min-h-screen', 'bg-white')
    })

    it('should have navigation with border', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] })
      })

      const { container } = render(<Home />)

      await waitFor(() => {
        expect(screen.queryByText('Loading images...')).not.toBeInTheDocument()
      })

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('bg-white', 'border-b', 'border-black')
    })
  })
})
