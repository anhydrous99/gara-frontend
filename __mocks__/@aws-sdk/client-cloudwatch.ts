/**
 * Mock for @aws-sdk/client-cloudwatch
 */

import { jest } from '@jest/globals'

export const mockSend = jest.fn().mockResolvedValue({})

export class CloudWatchClient {
  send = mockSend
  constructor() {
    // Mock constructor
  }
}

export class PutMetricDataCommand {
  input: unknown
  constructor(input: unknown) {
    this.input = input
  }
}
