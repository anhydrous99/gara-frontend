import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080'
process.env.GARA_API_KEY = 'test-api-key'
process.env.ADMIN_PASSWORD = 'test-password'
process.env.NEXTAUTH_SECRET = 'test-secret'

// Enhanced Headers polyfill for Next.js edge runtime compatibility
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = new Map()
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value))
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value))
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value))
        }
      }
    }

    get(name) {
      return this._headers.get(name.toLowerCase()) || null
    }

    set(name, value) {
      this._headers.set(name.toLowerCase(), String(value))
    }

    has(name) {
      return this._headers.has(name.toLowerCase())
    }

    delete(name) {
      this._headers.delete(name.toLowerCase())
    }

    append(name, value) {
      const existing = this.get(name)
      if (existing) {
        this.set(name, `${existing}, ${value}`)
      } else {
        this.set(name, value)
      }
    }

    forEach(callback, thisArg) {
      this._headers.forEach((value, key) => {
        callback.call(thisArg, value, key, this)
      })
    }

    keys() {
      return this._headers.keys()
    }

    values() {
      return this._headers.values()
    }

    entries() {
      return this._headers.entries()
    }

    [Symbol.iterator]() {
      return this._headers.entries()
    }
  }
}

// Minimal Request/Response polyfill for Next.js
if (typeof global.Request === 'undefined') {
  global.Request = class Request {}
}
if (typeof global.Response === 'undefined') {
  global.Response = class Response {}
}

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const { fill, unoptimized, priority, quality, ...rest } = props
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock edge runtime Symbol for cookies (required by NextRequest)
if (typeof Symbol.for('edge-runtime.headers') === 'undefined') {
  // Create a mock headers symbol that NextRequest uses internally
  const mockHeadersMap = new WeakMap()
  const originalHeadersConstructor = global.Headers

  global.Headers = class Headers extends originalHeadersConstructor {
    constructor(init) {
      super(init)
      // Store a reference that edge runtime can access
      mockHeadersMap.set(this, this)
    }
  }
}
