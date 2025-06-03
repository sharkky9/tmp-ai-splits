import 'whatwg-fetch'
import '@testing-library/jest-dom'

// Mock jose package to avoid ES module issues
jest.mock('jose', () => ({
  compactDecrypt: jest.fn(),
  EncryptJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    encrypt: jest.fn().mockResolvedValue('mock-encrypted-jwt'),
  })),
  jwtDecrypt: jest.fn(),
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-signed-jwt'),
  })),
  jwtVerify: jest.fn(),
}))

// Mock Supabase auth helpers that depend on jose
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
  })),
  createServerComponentClient: jest.fn(),
  createRouteHandlerClient: jest.fn(),
}))

// You can add other global setup here if needed

// Mock Supabase client for tests that don't need real DB interaction
// or to control responses. For DB integration tests, we'll use the real client.

// Example: Mocking a specific Supabase function globally if needed
// jest.mock('@/lib/supabaseClient', () => ({
//   supabase: {
//     auth: {
//       getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
//       // Add other mocked auth functions as needed
//     },
//     from: jest.fn(() => ({
//       select: jest.fn().mockReturnThis(),
//       insert: jest.fn().mockReturnThis(),
//       update: jest.fn().mockReturnThis(),
//       delete: jest.fn().mockReturnThis(),
//       eq: jest.fn().mockReturnThis(),
//       single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
//       // Add other mocked query builder functions as needed
//     })),
//   },
// }));
