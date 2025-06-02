import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { GroupDetailView } from '../GroupDetailView'

// Mock Supabase client
jest.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'groups') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() =>
                Promise.resolve({
                  data: {
                    id: 'test-group-id',
                    name: 'Test Group',
                    description: 'Test Description',
                    created_by: 'test-user-id',
                    created_at: '2023-01-01T00:00:00Z',
                    updated_at: '2023-01-01T00:00:00Z',
                  },
                  error: null,
                })
              ),
            })),
          })),
        }
      }

      if (table === 'group_members') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: 'member-1',
                      group_id: 'test-group-id',
                      user_id: 'test-user-id',
                      role: 'admin',
                      is_placeholder: false,
                      created_at: '2023-01-01T00:00:00Z',
                      profiles: {
                        id: 'test-user-id',
                        name: 'Test User',
                        email: 'test@example.com',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z',
                      },
                    },
                  ],
                  error: null,
                })
              ),
            })),
          })),
        }
      }
    }),
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: { id: 'test-user-id', email: 'test@example.com' },
            },
          },
          error: null,
        })
      ),
      onAuthStateChange: jest.fn((callback) => {
        callback('SIGNED_IN', {
          user: { id: 'test-user-id', email: 'test@example.com' },
          access_token: 'fake-token',
        })
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      }),
    },
  },
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      },
      mutations: { retry: false },
    },
  })

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
)

describe('GroupDetailView Data Fetching', () => {
  test('test_data_loads_correctly_without_revalidate', async () => {
    render(
      <TestWrapper>
        <GroupDetailView groupId='test-group-id' />
      </TestWrapper>
    )

    // Should show loading initially
    expect(screen.getByText('Loading group details...')).toBeInTheDocument()

    // Should load group data successfully
    await waitFor(
      () => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Should display group details
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  test('test_react_query_caching_behavior', async () => {
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GroupDetailView groupId='test-group-id' />
        </AuthProvider>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    // Check that data is cached in React Query
    const groupCache = queryClient.getQueryData(['group', 'test-group-id'])
    const membersCache = queryClient.getQueryData(['group-members', 'test-group-id'])

    expect(groupCache).toBeDefined()
    expect(membersCache).toBeDefined()

    // Cache should contain the expected data
    expect((groupCache as { name: string })?.name).toBe('Test Group')
    expect((membersCache as Array<{ profiles: { name: string } }>)?.[0]?.profiles?.name).toBe(
      'Test User'
    )
  })

  test('test_performance_acceptable_without_server_revalidation', async () => {
    const startTime = Date.now()

    render(
      <TestWrapper>
        <GroupDetailView groupId='test-group-id' />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    const loadTime = Date.now() - startTime

    // Should load within reasonable time (less than 2 seconds for test)
    expect(loadTime).toBeLessThan(2000)
  })

  test('test_no_stale_data_issues', async () => {
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GroupDetailView groupId='test-group-id' />
        </AuthProvider>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    // Verify query state shows fresh data
    const groupQuery = queryClient.getQueryState(['group', 'test-group-id'])
    const membersQuery = queryClient.getQueryState(['group-members', 'test-group-id'])

    expect(groupQuery?.status).toBe('success')
    expect(membersQuery?.status).toBe('success')

    // Verify data is fresh (no stale issues)
    expect(groupQuery?.dataUpdatedAt).toBeGreaterThan(0)
    expect(membersQuery?.dataUpdatedAt).toBeGreaterThan(0)
  })
})
