import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080'
process.env.GARA_API_KEY = 'test-api-key'
process.env.ADMIN_PASSWORD = 'test-password'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.AWS_REGION = 'us-east-1'
process.env.S3_BUCKET_NAME = 'test-bucket'

// Minimal Request/Response polyfill for Next.js (required by Next.js server components)
if (typeof global.Request === 'undefined') {
  global.Request = class Request {}
}
if (typeof global.Response === 'undefined') {
  global.Response = class Response {}
}
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor() {
      this.headers = {}
    }
    get(name) { return this.headers[name] }
    set(name, value) { this.headers[name] = value }
    has(name) { return name in this.headers }
  }
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
