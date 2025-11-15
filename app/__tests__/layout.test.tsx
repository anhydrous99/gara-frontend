import { render, screen } from '@testing-library/react'
import RootLayout, { metadata } from '../layout'

// Mock the Providers component
jest.mock('../providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <div data-testid="providers-wrapper">{children}</div>
}))

// Mock next-auth/react to prevent SessionProvider issues
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('RootLayout', () => {
  it('should render children within Providers', () => {
    render(
      <RootLayout>
        <div data-testid="test-content">Page Content</div>
      </RootLayout>
    )

    expect(screen.getByTestId('providers-wrapper')).toBeInTheDocument()
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('should wrap children with Providers component', () => {
    render(
      <RootLayout>
        <div data-testid="child-content">Content</div>
      </RootLayout>
    )

    expect(screen.getByTestId('providers-wrapper')).toBeInTheDocument()
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('should have correct metadata', () => {
    expect(metadata).toBeDefined()
    expect(metadata.title).toBe('Photography Portfolio')
    expect(metadata.description).toBe('A photography portfolio showcase')
  })

  it('should render multiple children', () => {
    render(
      <RootLayout>
        <header data-testid="header">Header</header>
        <main data-testid="main">Main Content</main>
        <footer data-testid="footer">Footer</footer>
      </RootLayout>
    )

    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('main')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })
})
