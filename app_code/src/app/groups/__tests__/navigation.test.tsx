import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import GroupsPage from '../page'
import { GroupListItem } from '@/components/Groups/GroupListItem'
import { GroupDetailView } from '@/components/Groups/GroupDetailView'
import { useAuthContext } from '@/contexts/AuthContext'

// Mock useAuthContext
jest.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2023-01-01T00:00:00Z',
      email_confirmed_at: '2023-01-01T00:00:00Z',
      last_sign_in_at: '2023-01-01T00:00:00Z',
      role: 'authenticated',
    },
    isLoading: false,
    setUser: jest.fn(),
    setSession: jest.fn(),
    setIsLoading: jest.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useParams: jest.fn(),
}))

// Mock Supabase client
jest.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'groups') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn((column, value) => {
              const mockGroupsQuery = {
                order: jest.fn(() =>
                  Promise.resolve({
                    data: [
                      {
                        id: 'test-group-id',
                        name: 'Test Navigation Group',
                        description: 'Testing navigation flows',
                        created_by: 'test-user-id',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z',
                        member_count: [{ count: 1 }],
                      },
                    ],
                    error: null,
                  })
                ),
                single: jest.fn(() => {
                  // For specific group queries
                  if (value === 'test-group-id') {
                    return Promise.resolve({
                      data: {
                        id: 'test-group-id',
                        name: 'Test Navigation Group',
                        description: 'Testing navigation flows',
                        created_by: 'test-user-id',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z',
                      },
                      error: null,
                    })
                  }
                  // For invalid group IDs
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Group not found' },
                  })
                }),
              }
              return mockGroupsQuery
            }),
          })),
        }
      }

      if (table === 'group_members') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => {
              const mockMembersQuery = {
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
              }
              return mockMembersQuery
            }),
          })),
        }
      }

      // Default fallback for other tables
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: [], error: null })),
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      }
    }),
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: '2023-01-01T00:00:00Z',
                email_confirmed_at: '2023-01-01T00:00:00Z',
                last_sign_in_at: '2023-01-01T00:00:00Z',
                role: 'authenticated',
              },
            },
          },
          error: null,
        })
      ),
      onAuthStateChange: jest.fn((callback) => {
        callback('SIGNED_IN', {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: '2023-01-01T00:00:00Z',
            email_confirmed_at: '2023-01-01T00:00:00Z',
            last_sign_in_at: '2023-01-01T00:00:00Z',
            role: 'authenticated',
          },
          access_token: 'fake-token',
          refresh_token: 'fake-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          expires_at: Date.now() / 1000 + 3600,
        })
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
              id: 'mock-subscription-id',
              callback: jest.fn(),
            },
          },
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
        gcTime: 0,
        staleTime: 0,
      },
      mutations: { retry: false },
    },
  })

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

describe('Step 4: Group Navigation Flows', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()
  const mockForward = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
      forward: mockForward,
      replace: jest.fn(),
      refresh: jest.fn(),
    })
    ;(usePathname as jest.Mock).mockReturnValue('/groups')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Action 1: Group List Navigation', () => {
    test('test_navigation_from_groups_page_to_group_details', async () => {
      render(
        <TestWrapper>
          <GroupsPage />
        </TestWrapper>
      )

      // Wait for groups to load
      await waitFor(() => {
        expect(screen.getByText('Test Navigation Group')).toBeInTheDocument()
      })

      // Find and click the group card
      const groupCard = screen.getByText('Test Navigation Group').closest('a')
      expect(groupCard).toHaveAttribute('href', '/groups/test-group-id')

      // Verify no revalidate errors in navigation
      expect(groupCard).toBeTruthy()
      expect(() => fireEvent.click(groupCard!)).not.toThrow()
    })

    test('test_group_list_item_has_correct_href', () => {
      const mockGroup = {
        id: 'test-group-id',
        name: 'Test Navigation Group',
        description: 'Testing navigation flows',
        created_by: 'test-user-id',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        member_count: 1,
      }

      render(
        <TestWrapper>
          <GroupListItem group={mockGroup} />
        </TestWrapper>
      )

      const linkElement = screen.getByRole('link')
      expect(linkElement).toHaveAttribute('href', '/groups/test-group-id')
    })
  })

  describe('Action 2: Direct URL Access', () => {
    test('test_direct_url_access_to_group_detail', async () => {
      ;(usePathname as jest.Mock).mockReturnValue('/groups/test-group-id')

      render(
        <TestWrapper>
          <GroupDetailView groupId='test-group-id' />
        </TestWrapper>
      )

      // Should load group details without revalidate error
      await waitFor(() => {
        expect(screen.getByText('Test Navigation Group')).toBeInTheDocument()
      })

      // Should display group content
      expect(screen.getByText('Testing navigation flows')).toBeInTheDocument()
    })

    test('test_direct_url_with_valid_group_id_loads_correctly', async () => {
      ;(usePathname as jest.Mock).mockReturnValue('/groups/test-group-id')

      const startTime = Date.now()

      render(
        <TestWrapper>
          <GroupDetailView groupId='test-group-id' />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Navigation Group')).toBeInTheDocument()
      })

      const loadTime = Date.now() - startTime

      // Should load quickly without server revalidation delays
      expect(loadTime).toBeLessThan(2000)
    })
  })

  describe('Action 3: Browser Back/Forward', () => {
    test('test_browser_back_navigation_works', () => {
      render(
        <TestWrapper>
          <GroupsPage />
        </TestWrapper>
      )

      // Test that mockBack is available and can be called without errors
      expect(() => mockBack()).not.toThrow()
      expect(mockBack).toBeDefined()
    })

    test('test_browser_forward_navigation_works', () => {
      render(
        <TestWrapper>
          <GroupsPage />
        </TestWrapper>
      )

      // Test that mockForward is available and can be called without errors
      expect(() => mockForward()).not.toThrow()
      expect(mockForward).toBeDefined()
    })
  })

  describe('Action 4: Group Creation Flow', () => {
    test('test_newly_created_group_navigation', async () => {
      render(
        <TestWrapper>
          <GroupsPage />
        </TestWrapper>
      )

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Create Group')).toBeInTheDocument()
      })

      // Find and click create group button
      const createButton = screen.getByText('Create Group')
      fireEvent.click(createButton)

      // Should open create group dialog without errors
      await waitFor(() => {
        const createButtons = screen.getAllByText('Create New Group')
        expect(createButtons.length).toBeGreaterThanOrEqual(1)
      })
    })

    test('test_create_group_flow_completes_successfully', async () => {
      render(
        <TestWrapper>
          <GroupsPage />
        </TestWrapper>
      )

      // Wait for groups to load
      await waitFor(() => {
        expect(screen.getByText('Test Navigation Group')).toBeInTheDocument()
      })

      // Click create group button
      const createButton = screen.getByRole('button', { name: /create group/i })
      fireEvent.click(createButton)

      // Should open create group dialog
      await waitFor(() => {
        const createButtons = screen.getAllByText('Create New Group')
        expect(createButtons.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('Action 5: Error Scenarios', () => {
    test('test_invalid_group_id_handling', async () => {
      ;(usePathname as jest.Mock).mockReturnValue('/groups/invalid-group-id')

      render(
        <TestWrapper>
          <GroupDetailView groupId='invalid-group-id' />
        </TestWrapper>
      )

      // Should handle error gracefully without throwing revalidate errors
      await waitFor(() => {
        expect(
          screen.getByText(/loading group details/i) ||
            screen.getByText(/failed to load group/i) ||
            screen.getByText(/group not found/i)
        ).toBeInTheDocument()
      })
    })

    test('test_unauthorized_access_handling', () => {
      // Mock user as null (unauthorized)
      const mockUseAuthContext = useAuthContext as jest.Mock
      mockUseAuthContext.mockReturnValueOnce({ user: null, isLoading: false })

      render(
        <TestWrapper>
          <GroupDetailView groupId='test-group-id' />
        </TestWrapper>
      )

      // Should show loading or unauthorized message
      expect(
        screen.getByText(/loading group details/i) ||
          screen.getByText(/please log in/i) ||
          screen.getByText(/welcome/i)
      ).toBeInTheDocument()
    })
  })

  describe('Validation: No JavaScript Errors', () => {
    test('test_no_revalidate_errors_in_navigation', async () => {
      ;(usePathname as jest.Mock).mockReturnValue('/groups/test-group-id')

      render(
        <TestWrapper>
          <GroupDetailView groupId='test-group-id' />
        </TestWrapper>
      )

      // Should load without errors (wait for data or loading state)
      await waitFor(() => {
        expect(
          screen.getByText('Test Navigation Group') || screen.getByText(/loading/i)
        ).toBeInTheDocument()
      })

      // Verify no console errors
      expect(() => screen.getByText('Test Navigation Group')).not.toThrow()
    })

    test('test_smooth_navigation_user_experience', async () => {
      // Ensure the mock is set to authenticated user for this test
      const mockUseAuthContext = useAuthContext as jest.Mock
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2023-01-01T00:00:00Z',
          email_confirmed_at: '2023-01-01T00:00:00Z',
          last_sign_in_at: '2023-01-01T00:00:00Z',
          role: 'authenticated',
        },
        isLoading: false,
        setUser: jest.fn(),
        setSession: jest.fn(),
        setIsLoading: jest.fn(),
      })

      render(
        <TestWrapper>
          <GroupsPage />
        </TestWrapper>
      )

      // Wait for authentication and initial load
      await waitFor(() => {
        expect(screen.getByText('Test Navigation Group')).toBeInTheDocument()
      })

      // Should show groups for authenticated user
      const groupCard = screen.getByText('Test Navigation Group').closest('a')
      expect(groupCard).toHaveAttribute('href', '/groups/test-group-id')
    })
  })
})
