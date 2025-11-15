import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoginPage from '../page'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn()
}))

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

describe('LoginPage', () => {
  const mockPush = jest.fn()
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn()
    } as any)
  })

  describe('Rendering', () => {
    it('should render login form with all elements', () => {
      render(<LoginPage />)

      expect(screen.getByRole('heading', { name: /Admin Login/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Enter admin password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
    })

    it('should have password input of type password', () => {
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form interaction', () => {
    it('should update password field on user input', () => {
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: 'test-password' } })

      expect(passwordInput.value).toBe('test-password')
    })

    it('should clear password field after typing and clearing', () => {
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: 'test' } })
      expect(passwordInput.value).toBe('test')

      fireEvent.change(passwordInput, { target: { value: '' } })
      expect(passwordInput.value).toBe('')
    })
  })

  describe('Successful login', () => {
    it('should call signIn with correct credentials on form submit', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: true, error: undefined } as any)

      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i)
      const submitButton = screen.getByRole('button', { name: /Sign In/i })

      fireEvent.change(passwordInput, { target: { value: 'admin-password' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          password: 'admin-password',
          redirect: false,
          callbackUrl: '/admin/dashboard'
        })
      })
    })

    it('should redirect to dashboard on successful login', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: true, error: undefined } as any)

      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i)
      const submitButton = screen.getByRole('button', { name: /Sign In/i })

      fireEvent.change(passwordInput, { target: { value: 'correct-password' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/dashboard')
      })
    })

    it('should show loading state during sign in', async () => {
      mockSignIn.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ ok: true } as any), 100)))

      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i)
      const submitButton = screen.getByRole('button', { name: /Sign In/i })

      fireEvent.change(passwordInput, { target: { value: 'password' } })
      fireEvent.click(submitButton)

      expect(screen.getByRole('button', { name: /Signing in.../i })).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
      })
    })

    it('should disable input during loading', async () => {
      mockSignIn.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ ok: true } as any), 100)))

      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i)
      const submitButton = screen.getByRole('button', { name: /Sign In/i })

      fireEvent.change(passwordInput, { target: { value: 'password' } })
      fireEvent.click(submitButton)

      expect(passwordInput).toBeDisabled()

      await waitFor(() => {
        expect(passwordInput).not.toBeDisabled()
      })
    })
  })

  describe('Failed login', () => {
    it('should show error message on invalid password', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: false, error: 'Invalid credentials' } as any)

      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i)
      const submitButton = screen.getByRole('button', { name: /Sign In/i })

      fireEvent.change(passwordInput, { target: { value: 'wrong-password' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument()
      })
    })

    it('should show error message on exception', async () => {
      mockSignIn.mockRejectedValueOnce(new Error('Network error'))

      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i)
      const submitButton = screen.getByRole('button', { name: /Sign In/i })

      fireEvent.change(passwordInput, { target: { value: 'password' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument()
      })
    })

    it('should clear previous error on new submission', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: false, error: 'Invalid credentials' } as any)

      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i)
      const submitButton = screen.getByRole('button', { name: /Sign In/i })

      // First failed attempt
      fireEvent.change(passwordInput, { target: { value: 'wrong' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument()
      })

      // Second attempt with different password
      mockSignIn.mockResolvedValueOnce({ ok: true, error: undefined } as any)
      fireEvent.change(passwordInput, { target: { value: 'correct' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('Invalid password')).not.toBeInTheDocument()
      })
    })

    it('should not redirect on failed login', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: false, error: 'Invalid credentials' } as any)

      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/Password/i)
      const submitButton = screen.getByRole('button', { name: /Sign In/i })

      fireEvent.change(passwordInput, { target: { value: 'wrong' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Form submission', () => {
    it('should submit form on Enter key', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: true, error: undefined } as any)

      render(<LoginPage />)

      const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')!
      const passwordInput = screen.getByLabelText(/Password/i)

      fireEvent.change(passwordInput, { target: { value: 'password' } })
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled()
      })
    })
  })
})
