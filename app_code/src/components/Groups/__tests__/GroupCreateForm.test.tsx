import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom' // This provides the toBeInTheDocument matcher
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroupCreateForm } from '../GroupCreateForm'
import { AuthProvider } from '@/contexts/AuthContext'

// This will fail until GroupCreateForm is implemented
// import { GroupCreateForm } from '../GroupCreateForm'

// Mock Supabase client
jest.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: { id: 'test-group-id', name: 'Test Group', created_by: 'test-user-id' },
              error: null,
            })
          ),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
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
        // Immediately call the callback with a session to simulate logged in user
        callback('SIGNED_IN', {
          user: { id: 'test-user-id', email: 'test@example.com' },
          access_token: 'fake-token',
        })
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      }),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
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

describe('GroupCreateForm', () => {
  test('test_group_creation_with_valid_name', async () => {
    const onSuccess = jest.fn()
    render(
      <TestWrapper>
        <GroupCreateForm onSuccess={onSuccess} />
      </TestWrapper>
    )

    const nameInput = screen.getByLabelText(/group name/i)
    const submitButton = screen.getByRole('button', { name: /create group/i })

    fireEvent.change(nameInput, { target: { value: 'Test Group' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText(/creating/i)).not.toBeInTheDocument()
    })

    // Should succeed without errors
    expect(screen.queryByText(/failed to create group/i)).not.toBeInTheDocument()
  })

  test('test_group_creation_with_empty_name', async () => {
    render(
      <TestWrapper>
        <GroupCreateForm onSuccess={() => {}} />
      </TestWrapper>
    )

    const submitButton = screen.getByRole('button', { name: /create group/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/group name is required/i)).toBeInTheDocument()
    })
  })

  test('test_group_creation_form_validation', () => {
    render(
      <TestWrapper>
        <GroupCreateForm onSuccess={() => {}} />
      </TestWrapper>
    )

    // Form should be present with required fields
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create group/i })).toBeInTheDocument()
  })
})
