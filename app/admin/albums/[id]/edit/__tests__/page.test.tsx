import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import EditAlbumPage from '../page'

jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: any) => <a href={href}>{children}</a> }))
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => {
  const { fill, ...rest } = props
  return <img {...rest} />
}}))
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => [])
}))
jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: jest.fn(),
  SortableContext: ({ children }: any) => <div>{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  rectSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false
  })
}))
jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => ''
    }
  }
}))

global.fetch = jest.fn()

const mockPush = jest.fn()
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>

beforeEach(() => {
  jest.clearAllMocks()
  mockUseRouter.mockReturnValue({ push: mockPush } as any)
  mockUseParams.mockReturnValue({ id: 'test-album-123' })
})

describe('EditAlbumPage', () => {
  it('should redirect to login when unauthenticated', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as any)
    render(<EditAlbumPage />)
    expect(mockPush).toHaveBeenCalledWith('/admin/login')
  })

  it('should show loading state', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' } as any)
    render(<EditAlbumPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should fetch and display album', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' } as any)
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          album_id: 'test-album-123',
          name: 'Test Album',
          description: 'Test Description',
          tags: ['nature'],
          published: true,
          cover_image_id: 'img1',
          images: [{ id: 'img1', url: 'url1' }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ images: [] })
      })

    render(<EditAlbumPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Album')).toBeInTheDocument()
    })
  })
})
