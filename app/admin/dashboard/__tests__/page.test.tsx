import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardPage from '../page'

jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: any) => <a href={href}>{children}</a> }))
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }))

global.fetch = jest.fn()

describe('DashboardPage', () => {
  const mockPush = jest.fn()
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: mockPush } as any)
  })

  it('should redirect to login when unauthenticated', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as any)
    render(<DashboardPage />)
    expect(mockPush).toHaveBeenCalledWith('/admin/login')
  })

  it('should show loading state', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' } as any)
    render(<DashboardPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should fetch and display images when authenticated', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [{ id: '1', name: 'img1', url: 'url1', uploadedAt: '2024-01-01' }] })
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/images')
    })
  })

  it('should show error when no file selected', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [] })
    })

    render(<DashboardPage />)

    await waitFor(() => {
      const uploadButton = screen.getByText('Upload Image')
      expect(uploadButton).toBeInTheDocument()
    })

    const form = screen.getByText('Upload Image').closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Please select an image')).toBeInTheDocument()
    })
  })

  it('should call signOut', async () => {
    const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Sign Out'))
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should handle fetch images error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/images')
    })

    consoleErrorSpy.mockRestore()
  })
})
