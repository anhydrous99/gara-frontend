/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module '@jest/expect' {
  interface Matchers<R> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
}

declare module 'expect' {
  interface Matchers<R> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
}
