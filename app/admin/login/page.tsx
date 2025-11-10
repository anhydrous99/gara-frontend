'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        password,
        redirect: false,
        callbackUrl: '/admin/dashboard',
      })

      if (result?.error) {
        setError('Invalid password')
      } else if (result?.ok) {
        router.push('/admin/dashboard')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl text-center mb-12 tracking-wide">
          Admin Login
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="password" className="block text-sm mb-3 tracking-wide">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 border border-black bg-transparent focus:outline-none focus:outline-offset-2 transition-colors"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-black px-4 py-3 hover:bg-black hover:text-white disabled:opacity-30 transition-colors tracking-wide"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
