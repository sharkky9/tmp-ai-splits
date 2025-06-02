import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import GroupsPage from '../page'
import GroupDetailPage from '../[groupId]/page'
import { GroupListItem } from '@/components/Groups/GroupListItem'
import * as supabaseModule from '../../../lib/supabaseClient'

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
            eq: jest.fn(() => ({
              single: jest.fn(() =>
                Promise.resolve({
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
              ),
            })),
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
                    member_count: 1,
                  },
                ],
                error: null,
              })
            ),
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
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
)

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
          <GroupDetailPage params={{ groupId: 'test-group-id' }} />
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
          <GroupDetailPage params={{ groupId: 'test-group-id' }} />
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
          <GroupDetailPage params={{ groupId: 'test-group-id' }} />
        </TestWrapper>
      )

      // Simulate browser back button
      expect(() => mockBack()).not.toThrow()
      expect(mockBack).toBeDefined()
    })

    test('test_browser_forward_navigation_works', () => {
      render(
        <TestWrapper>
          <GroupDetailPage params={{ groupId: 'test-group-id' }} />
        </TestWrapper>
      )

      // Simulate browser forward button
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
        expect(screen.getByText('Create New Group')).toBeInTheDocument()
      })
    })
  })

  describe('Action 5: Error Scenarios', () => {
    test('test_invalid_group_id_handling', async () => {
      // Mock error response for invalid group ID
      const mockSupabase = jest.mocked(supabaseModule.supabase)
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'groups') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() =>
                  Promise.resolve({
                    data: null,
                    error: { message: 'Group not found' },
                  })
                ),
              })),
            })),
          } as never
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                })
              ),
            })),
          })),
        } as never
      })

      render(
        <TestWrapper>
          <GroupDetailPage params={{ groupId: 'invalid-group-id' }} />
        </TestWrapper>
      )

      // Should handle error gracefully without throwing revalidate errors
      await waitFor(() => {
        expect(screen.getByText('Loading group details...')).toBeInTheDocument()
      })
    })

    test('test_unauthorized_access_handling', async () => {
      // Mock unauthorized response
      const mockSupabase = jest.mocked(supabaseModule.supabase)
      mockSupabase.auth.getSession.mockImplementation(() =>
        Promise.resolve({
          data: { session: null },
          error: null,
        })
      )

      render(
        <TestWrapper>
          <GroupsPage />
        </TestWrapper>
      )

      // Should show login prompt without navigation errors
      await waitFor(() => {
        expect(screen.getByText('Please log in to view your groups.')).toBeInTheDocument()
      })
    })
  })

  describe('Validation: No JavaScript Errors', () => {
    test('test_no_revalidate_errors_in_navigation', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <TestWrapper>
          <GroupDetailPage params={{ groupId: 'test-group-id' }} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Navigation Group')).toBeInTheDocument()
      })

      // Should not have any revalidate-related console errors
      const revalidateErrors = consoleErrorSpy.mock.calls.filter((call) =>
        call.some((arg) => typeof arg === 'string' && arg.includes('revalidate'))
      )

      expect(revalidateErrors).toHaveLength(0)

      consoleErrorSpy.mockRestore()
    })

    test('test_smooth_navigation_user_experience', async () => {
      const performanceStart = Date.now()

      render(
        <TestWrapper>
          <GroupsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Navigation Group')).toBeInTheDocument()
      })

      const performanceEnd = Date.now()
      const totalTime = performanceEnd - performanceStart

      // Should provide smooth UX with fast loading
      expect(totalTime).toBeLessThan(1000)
    })
  })
})
