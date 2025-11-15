import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminAlbumsPage from '../page'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}))

global.fetch = jest.fn()
global.confirm = jest.fn()
global.alert = jest.fn()

describe('AdminAlbumsPage', () => {
  const mockPush = jest.fn()
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
  const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    ;(global.confirm as jest.Mock).mockClear()
    ;(global.alert as jest.Mock).mockClear()

    mockUseRouter.mockReturnValue({ push: mockPush } as any)
  })

  it('should redirect to login when unauthenticated', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as any)

    render(<AdminAlbumsPage />)

    expect(mockPush).toHaveBeenCalledWith('/admin/login')
  })

  it('should show loading state', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' } as any)

    render(<AdminAlbumsPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should fetch and display albums when authenticated', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        albums: [
          { album_id: '1', name: 'Album 1', image_ids: ['img1'], tags: ['tag1'], published: true }
        ]
      })
    })

    render(<AdminAlbumsPage />)

    await waitFor(() => {
      expect(screen.getByText('Album 1')).toBeInTheDocument()
    })

    expect(screen.getByText('1 images')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('should show empty state when no albums', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ albums: [] })
    })

    render(<AdminAlbumsPage />)

    await waitFor(() => {
      expect(screen.getByText(/No albums yet/)).toBeInTheDocument()
    })
  })

  it('should handle delete album', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [{ album_id: '1', name: 'Album 1', image_ids: [], tags: [], published: true }] })
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] })
      })

    ;(global.confirm as jest.Mock).mockReturnValue(true)

    render(<AdminAlbumsPage />)

    await waitFor(() => {
      expect(screen.getByText('Album 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/albums/1', { method: 'DELETE' })
    })
  })

  it('should call signOut', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ albums: [] })
    })

    render(<AdminAlbumsPage />)

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Sign Out'))

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('should show error state', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<AdminAlbumsPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load albums')).toBeInTheDocument()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should show draft status', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        albums: [{ album_id: '1', name: 'Draft Album', image_ids: [], tags: [], published: false }]
      })
    })

    render(<AdminAlbumsPage />)

    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })
  })

  it('should display album tags', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        albums: [{ album_id: '1', name: 'Album', image_ids: [], tags: ['nature', 'sunset'], published: true }]
      })
    })

    render(<AdminAlbumsPage />)

    await waitFor(() => {
      expect(screen.getByText('nature')).toBeInTheDocument()
      expect(screen.getByText('sunset')).toBeInTheDocument()
    })
  })
})
