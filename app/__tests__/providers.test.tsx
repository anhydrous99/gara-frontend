import { render, screen } from '@testing-library/react'
import { Providers } from '../providers'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="session-provider">{children}</div>
}))

describe('Providers', () => {
  it('should render children within SessionProvider', () => {
    render(
      <Providers>
        <div data-testid="test-child">Test Content</div>
      </Providers>
    )

    expect(screen.getByTestId('session-provider')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should render multiple children', () => {
    render(
      <Providers>
        <div data-testid="child-1">First Child</div>
        <div data-testid="child-2">Second Child</div>
      </Providers>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
  })

  it('should render with empty children', () => {
    render(<Providers>{null}</Providers>)

    expect(screen.getByTestId('session-provider')).toBeInTheDocument()
  })
})
