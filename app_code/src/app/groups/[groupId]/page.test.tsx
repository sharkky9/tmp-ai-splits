import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import GroupDetailPage from './page'
import fs from 'fs'
import path from 'path'

// Mock Supabase client
jest.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: {
                group_id: 'test-group-id',
                name: 'Test Group',
                created_by: 'test-user-id',
                created_at: '2023-01-01T00:00:00Z',
              },
              error: null,
            })
          ),
        })),
        order: jest.fn(() =>
          Promise.resolve({
            data: [
              {
                id: 'member-1',
                group_id: 'test-group-id',
                user_id: 'test-user-id',
                role: 'admin',
                profiles: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
              },
            ],
            error: null,
          })
        ),
      })),
    })),
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

// Mock the params Promise
const mockParams = Promise.resolve({ groupId: 'test-group-id' })

describe('GroupDetailPage', () => {
  test('test_successful_group_navigation', async () => {
    // This test ensures the component renders successfully after revalidate fix
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(
        <TestWrapper>
          <GroupDetailPage params={mockParams} />
        </TestWrapper>
      )
    }).not.toThrow()

    // Cleanup
    consoleSpy.mockRestore()
  })

  test('test_no_revalidate_export_in_client_component', async () => {
    // This test checks that the revalidate export has been removed from the client component
    // Read the page file content to verify no revalidate export exists
    const pageContent = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

    // After fix, this should pass - no revalidate export in client component
    expect(pageContent).not.toMatch(/export\s+const\s+revalidate\s*=/)
  })

  test('test_group_detail_page_loads_with_expected_content', async () => {
    // This test verifies the group detail page loads with expected content after fix
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <TestWrapper>
        <GroupDetailPage params={mockParams} />
      </TestWrapper>
    )

    // The page should render without errors and show loading or content
    const loadingText = screen.queryByText('Loading group details...')
    const container = document.querySelector('.container')

    // Should have either loading state or the container div
    expect(loadingText || container).toBeInTheDocument()

    // Cleanup
    consoleSpy.mockRestore()
  })

  test('test_page_is_client_component', async () => {
    // Verify this remains a client component after the fix
    const pageContent = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

    // Should still be a client component
    expect(pageContent).toMatch(/'use client'/)
  })
})
