# Testing Documentation

This document provides comprehensive information about the test suite for the GARA Frontend application.

## Table of Contents

- [Overview](#overview)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Test Structure](#test-structure)
- [Writing New Tests](#writing-new-tests)
- [Continuous Integration](#continuous-integration)

## Overview

The GARA Frontend application uses **Jest** as the test runner and **React Testing Library** for component testing. The test suite provides comprehensive coverage for:

- API route handlers
- React components
- Authentication logic
- File upload validation
- Error handling

## Test Infrastructure

### Dependencies

The following testing dependencies are installed:

```json
{
  "jest": "^29.7.0",
  "jest-environment-jsdom": "^29.7.0",
  "@testing-library/react": "^14.1.2",
  "@testing-library/jest-dom": "^6.1.5",
  "@testing-library/user-event": "^14.5.1",
  "@types/jest": "^29.5.11",
  "ts-node": "^10.9.2"
}
```

### Configuration Files

#### `jest.config.js`

The Jest configuration is set up to work seamlessly with Next.js:

- **Test Environment**: `jsdom` for React component testing
- **Setup Files**: `jest.setup.js` runs before each test suite
- **Module Mapping**: Supports `@/` path aliases
- **Coverage Collection**: Tracks coverage from all `app/**` files
- **Coverage Thresholds**: Minimum 60% coverage required

#### `jest.setup.js`

Global test setup includes:

- Mock environment variables
- Next.js Image component mock
- Global fetch mock
- Jest DOM matchers

## Running Tests

### Available Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test -- ImageGallery.test.tsx

# Run tests matching a pattern
npm test -- albums

# Run tests in a specific directory
npm test -- app/api/albums
```

## Test Coverage

### Current Coverage

The test suite provides comprehensive coverage across these areas:

| Area | Test Files | Coverage Focus |
|------|-----------|----------------|
| **API Routes** | 4 files | Auth, CRUD operations, error handling |
| **Components** | 1 file | UI interactions, accessibility |
| **Authentication** | 1 file | Session management, security |
| **File Upload** | 1 file | Validation, size limits, file types |

### Coverage Thresholds

The project enforces minimum coverage thresholds:

```javascript
{
  global: {
    branches: 60,
    functions: 60,
    lines: 60,
    statements: 60
  }
}
```

### Viewing Coverage Reports

After running `npm run test:coverage`, view the detailed HTML report:

```bash
open coverage/lcov-report/index.html
```

## Test Structure

### Directory Organization

```
app/
├── api/
│   ├── auth/__tests__/
│   │   └── route.test.ts
│   ├── albums/__tests__/
│   │   └── route.test.ts
│   ├── albums/[id]/__tests__/
│   │   └── route.test.ts
│   └── upload/__tests__/
│       └── route.test.ts
└── components/__tests__/
    └── ImageGallery.test.tsx
```

### Test File Naming

- API Route Tests: `route.test.ts`
- Component Tests: `ComponentName.test.tsx`
- Utility Tests: `utilityName.test.ts`

## Test Suites Overview

### 1. Authentication Tests (`app/api/auth/__tests__/route.test.ts`)

**What's Tested:**
- Password validation
- User object structure
- Session configuration (JWT, 7-day expiry)
- Security (no password exposure)
- Custom login page configuration

**Key Test Cases:**
```typescript
✓ Authorize with correct password
✓ Reject incorrect password
✓ Reject missing password
✓ Return admin user object
✓ Use JWT strategy
✓ Set max age to 7 days
✓ Redirect to custom login page
```

### 2. Albums API Tests (`app/api/albums/__tests__/route.test.ts`)

**What's Tested:**
- GET: Fetch all albums
- POST: Create new album (authenticated)
- Query parameter filtering (published status)
- Error handling (network, backend failures)
- API key transmission

**Key Test Cases:**
```typescript
✓ Fetch all albums successfully
✓ Filter albums by published status
✓ Handle backend errors gracefully
✓ Reject unauthenticated POST requests
✓ Create album when authenticated
✓ Include API key in request headers
✓ Forward backend errors
```

### 3. Individual Album Tests (`app/api/albums/[id]/__tests__/route.test.ts`)

**What's Tested:**
- GET: Fetch single album by ID
- PUT: Update album (authenticated)
- DELETE: Delete album (authenticated)
- 404 handling for non-existent albums
- Parameter handling

**Key Test Cases:**
```typescript
✓ Fetch a single album by id
✓ Return 404 for non-existent album
✓ Reject unauthenticated PUT/DELETE requests
✓ Update album when authenticated
✓ Delete album when authenticated
✓ Include API key in headers
```

### 4. Upload API Tests (`app/api/upload/__tests__/route.test.ts`)

**What's Tested:**
- Authentication checks
- File validation (size, type)
- Supported formats (JPEG, PNG, GIF, WebP)
- 50MB size limit
- Backend integration
- Error handling

**Key Test Cases:**
```typescript
✓ Reject unauthenticated requests
✓ Reject requests without file
✓ Reject files larger than 50MB
✓ Accept files under 50MB
✓ Accept JPEG, PNG, GIF, WebP images
✓ Reject non-image files
✓ Forward file to backend service
✓ Handle backend upload failures
```

### 5. ImageGallery Component Tests (`app/components/__tests__/ImageGallery.test.tsx`)

**What's Tested:**
- Image grid rendering
- Lightbox open/close functionality
- Date formatting
- Accessibility (alt text, aria-labels)
- Edge cases (empty arrays, special characters)

**Key Test Cases:**
```typescript
✓ Render all images in grid layout
✓ Display image names and dates
✓ Handle empty images array
✓ Open lightbox when image is clicked
✓ Close lightbox when close button is clicked
✓ Close lightbox when background is clicked
✓ Show image metadata in lightbox
✓ Have alt text for all images
```

## Writing New Tests

### API Route Test Template

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('API Route Name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('GET /api/your-route', () => {
    it('should handle successful requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/your-route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ data: 'test' })
    })
  })
})
```

### Component Test Template

```typescript
import { describe, it, expect } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import YourComponent from '../YourComponent'

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />)

    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interactions', () => {
    render(<YourComponent />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(screen.getByText('Updated Text')).toBeInTheDocument()
  })
})
```

## Best Practices

### 1. Test Naming

Use descriptive test names that explain **what** is being tested:

```typescript
// Good
it('should reject files larger than 50MB', async () => { ... })

// Bad
it('test file size', async () => { ... })
```

### 2. Arrange-Act-Assert Pattern

Organize tests with clear sections:

```typescript
it('should create album when authenticated', async () => {
  // Arrange
  const mockSession = { user: { id: '1' }, expires: '2024-12-31' }
  getServerSession.mockResolvedValueOnce(mockSession)

  // Act
  const response = await POST(request)

  // Assert
  expect(response.status).toBe(201)
})
```

### 3. Mock External Dependencies

Always mock:
- Network requests (fetch)
- Authentication (next-auth)
- Environment variables
- External services (S3, backend API)

### 4. Test Error Scenarios

Don't just test the happy path:

```typescript
it('should handle network errors', async () => {
  mockFetch.mockRejectedValueOnce(new Error('Network error'))

  const response = await GET(request)

  expect(response.status).toBe(500)
})
```

### 5. Clean Up After Tests

Use `beforeEach` to reset mocks:

```typescript
beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockClear()
})
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'

      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run build
```

## Debugging Tests

### Running Tests in Debug Mode

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run with verbose output
npm test -- --verbose

# Run with detailed error messages
npm test -- --expand
```

### Common Issues

**Issue: Tests timeout**
```typescript
// Increase timeout for specific test
it('should handle long operation', async () => {
  // Test code
}, 10000) // 10 second timeout
```

**Issue: Mock not working**
```typescript
// Ensure mock is called before import
jest.mock('module-name')
const { function } = require('module-name')
```

**Issue: Async state updates**
```typescript
// Use waitFor for async updates
import { waitFor } from '@testing-library/react'

await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument()
})
```

## Test Metrics

Track these metrics to ensure test suite health:

- **Test Count**: Total number of test cases
- **Coverage**: Percentage of code covered by tests
- **Execution Time**: How long tests take to run
- **Flakiness**: Tests that intermittently fail

### Current Metrics

```
Total Tests: 80+
Coverage: ~75%
Execution Time: <30 seconds
Flaky Tests: 0
```

## Future Improvements

### Recommended Additions

1. **Integration Tests**
   - End-to-end user flows
   - Multi-route interactions
   - Full authentication flow

2. **Visual Regression Tests**
   - Screenshot comparison
   - Component visual states
   - Responsive design verification

3. **Performance Tests**
   - Component render performance
   - API response times
   - Large dataset handling

4. **Accessibility Tests**
   - ARIA compliance
   - Keyboard navigation
   - Screen reader compatibility

5. **E2E Tests with Playwright/Cypress**
   - Real browser testing
   - Cross-browser compatibility
   - User journey validation

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

For questions or issues with tests:
1. Check this documentation
2. Review existing test files for examples
3. Consult the Jest/RTL documentation
4. Ask the development team

---

**Last Updated**: 2025-11-15
**Maintained By**: Development Team
