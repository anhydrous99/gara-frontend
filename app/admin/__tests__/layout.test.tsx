import { render, screen } from '@testing-library/react'
import AdminLayout, { metadata } from '../layout'

describe('AdminLayout', () => {
  it('should render children directly without wrapper', () => {
    render(
      <AdminLayout>
        <div data-testid="admin-content">Admin Content</div>
      </AdminLayout>
    )

    expect(screen.getByTestId('admin-content')).toBeInTheDocument()
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('should render multiple children', () => {
    render(
      <AdminLayout>
        <header data-testid="header">Header</header>
        <main data-testid="main">Main</main>
      </AdminLayout>
    )

    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('main')).toBeInTheDocument()
  })

  it('should have correct metadata', () => {
    expect(metadata).toBeDefined()
    expect(metadata.title).toBe('Admin Panel - Photography Portfolio')
    expect(metadata.description).toBe('Admin panel for managing portfolio images')
  })

  it('should render with empty children', () => {
    const { container } = render(<AdminLayout>{null}</AdminLayout>)

    expect(container).toBeInTheDocument()
  })
})
