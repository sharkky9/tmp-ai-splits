import '@testing-library/jest-dom'

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
