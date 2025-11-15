import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import CreateAlbumPage from '../page'

jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: any) => <a href={href}>{children}</a> }))

const mockPush = jest.fn()
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

beforeEach(() => {
  jest.clearAllMocks()
  mockUseRouter.mockReturnValue({ push: mockPush } as any)
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
})
