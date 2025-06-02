export const startSpan = jest.fn((options, callback) => {
  // If callback is provided, execute it
  if (callback) {
    try {
      const mockSpan = {
        setStatus: jest.fn(),
        finish: jest.fn(),
        // Add other methods if your Sentry utility functions try to call them on the span
      }
      const result = callback(mockSpan)
      // If callback returns a promise, handle it for async spans
      if (result && typeof result.then === 'function') {
        return result.catch((error: any) => {
          // Simulate Sentry behavior of re-throwing the error
          throw error
        })
      }
      return result
    } catch (error) {
      throw error
    }
  }
  // If no callback (though your current usage provides one), return a mock span object
  return {
    setStatus: jest.fn(),
    finish: jest.fn(),
  }
})

export const setTag = jest.fn()
export const setUser = jest.fn()
export const captureException = jest.fn()
export const withScope = jest.fn((callback) => {
  const mockScope = {
    setTag: jest.fn(),
    setUser: jest.fn(),
    setContext: jest.fn(),
  }
  callback(mockScope)
})

export const startTransaction = jest.fn(() => ({
  setStatus: jest.fn(),
  finish: jest.fn(),
  // Add other span methods if needed by your code that uses startTransaction
}))

// Mock other Sentry SDK exports if needed by your sentry.ts utilities
// e.g., if Sentry.init were called directly in sentry.ts
// export const init = jest.fn();

// You might need to mock specific integrations if your code directly uses them
// For example:
// export const browserTracingIntegration = jest.fn(() => ({ name: 'BrowserTracing' }));
// export const replayIntegration = jest.fn(() => ({ name: 'Replay' }));
