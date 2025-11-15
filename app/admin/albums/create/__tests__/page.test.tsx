import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import CreateAlbumPage from '../page'

jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: any) => <a href={href}>{children}</a> }))

global.fetch = jest.fn()

const mockPush = jest.fn()
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

beforeEach(() => {
  jest.clearAllMocks()
  mockUseRouter.mockReturnValue({ push: mockPush } as any)
  ;(global.fetch as jest.Mock).mockClear()
})

describe('CreateAlbumPage', () => {
  it('should redirect to login when unauthenticated', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as any)
    render(<CreateAlbumPage />)
    expect(mockPush).toHaveBeenCalledWith('/admin/login')
  })

  it('should show loading state', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' } as any)
    render(<CreateAlbumPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render form when authenticated', () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    render(<CreateAlbumPage />)
    expect(screen.getByRole('button', { name: /Create Album/i })).toBeInTheDocument()
  })

  it('should update form fields', () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    render(<CreateAlbumPage />)

    const nameInput = screen.getByPlaceholderText(/my amazing album/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'My Album' } })
    expect(nameInput.value).toBe('My Album')
  })

  it('should add tags', () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    render(<CreateAlbumPage />)

    const tagInput = screen.getByPlaceholderText(/add a tag/i)
    fireEvent.change(tagInput, { target: { value: 'nature' } })
    fireEvent.click(screen.getByText('Add'))

    expect(screen.getByText('nature')).toBeInTheDocument()
  })

  it('should handle successful form submission', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ album_id: 'new-123' })
    })

    render(<CreateAlbumPage />)

    const nameInput = screen.getByPlaceholderText(/my amazing album/i)
    fireEvent.change(nameInput, { target: { value: 'Test Album' } })

    fireEvent.click(screen.getByRole('button', { name: /create album/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/albums/new-123/edit')
    })
  })

  it('should handle form submission error', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ details: 'Validation failed' })
    })

    render(<CreateAlbumPage />)

    const nameInput = screen.getByPlaceholderText(/my amazing album/i)
    fireEvent.change(nameInput, { target: { value: 'Test Album' } })

    fireEvent.click(screen.getByRole('button', { name: /create album/i }))

    await waitFor(() => {
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument()
    })
  })

  it('should call signOut', () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    render(<CreateAlbumPage />)

    fireEvent.click(screen.getByText(/sign out/i))
    expect(mockSignOut).toHaveBeenCalled()
  })
})
