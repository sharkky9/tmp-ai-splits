import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GroupBalances from '../GroupBalances'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(),
}))

const mockGroupMembers = [
  {
    id: 'member-1',
    user_id: 'user-1',
    placeholder_name: null,
    is_placeholder: false,
    profiles: { name: 'Alice Smith' },
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    placeholder_name: null,
    is_placeholder: false,
    profiles: { name: 'Bob Johnson' },
  },
  {
    id: 'member-3',
    user_id: null,
    placeholder_name: 'Charlie Wilson',
    is_placeholder: true,
    profiles: null,
  },
]

const mockExpenses = [
  {
    id: 'expense-1',
    total_amount: 30.0,
    payer_id: 'member-1',
    status: 'confirmed',
  },
  {
    id: 'expense-2',
    total_amount: 60.0,
    payer_id: 'member-2',
    status: 'confirmed',
  },
]

const mockExpenseSplits = [
  { expense_id: 'expense-1', member_id: 'member-1', amount: 10.0 },
  { expense_id: 'expense-1', member_id: 'member-2', amount: 10.0 },
  { expense_id: 'expense-1', member_id: 'member-3', amount: 10.0 },
  { expense_id: 'expense-2', member_id: 'member-1', amount: 20.0 },
  { expense_id: 'expense-2', member_id: 'member-2', amount: 30.0 },
  { expense_id: 'expense-2', member_id: 'member-3', amount: 10.0 },
]

describe('GroupBalances', () => {
  let queryClient: QueryClient
  let mockSupabase: any

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    mockSupabase = {
      from: jest.fn(),
    }
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const renderComponent = (groupId: string = 'test-group') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GroupBalances groupId={groupId} />
      </QueryClientProvider>
    )
  }

  const setupSuccessfulMocks = () => {
    // Mock group members query
    const membersMock = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockGroupMembers,
          error: null,
        }),
      }),
    }

    // Mock expenses query - needs to handle .eq('group_id').eq('status')
    const expensesMock = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockExpenses,
            error: null,
          }),
        }),
      }),
    }

    // Mock expense splits query
    const splitsMock = {
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: mockExpenseSplits,
          error: null,
        }),
      }),
    }

    mockSupabase.from
      .mockReturnValueOnce(membersMock)
      .mockReturnValueOnce(expensesMock)
      .mockReturnValueOnce(splitsMock)
  }

  it('should render loading state initially', async () => {
    // Setup a slow mock to capture loading state
    const slowMembersMock = {
      select: jest.fn().mockReturnValue({
        eq: jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve({ data: mockGroupMembers, error: null }), 100)
              )
          ),
      }),
    }

    mockSupabase.from.mockReturnValue(slowMembersMock)

    await act(async () => {
      renderComponent()
    })

    expect(screen.getByText('Group Balances')).toBeInTheDocument()
  })

  it('should display balances correctly when data is loaded', async () => {
    setupSuccessfulMocks()

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      expect(screen.getByText('Charlie Wilson')).toBeInTheDocument()
    })

    // Check balance displays - use more specific queries to avoid conflicts with legend
    expect(screen.getByText('Gets back $20.00')).toBeInTheDocument() // Bob: +$20 balance
    expect(screen.getByText('Owes $20.00')).toBeInTheDocument() // Charlie: -$20 balance

    // Check guest indicator
    expect(screen.getByText('Guest')).toBeInTheDocument()

    // Check legend exists
    expect(screen.getByText('Gets money back')).toBeInTheDocument()
    expect(screen.getByText('Owes money')).toBeInTheDocument()

    // Check that there are "Settled up" elements (both in balance and legend)
    const settledElements = screen.getAllByText('Settled up')
    expect(settledElements.length).toBeGreaterThan(0)
  })

  it('should display empty state when no balances', async () => {
    const emptyMembersMock = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    }

    mockSupabase.from.mockReturnValue(emptyMembersMock)

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getByText('No balances to show')).toBeInTheDocument()
      expect(screen.getByText('Add some expenses to see who owes what')).toBeInTheDocument()
    })
  })

  it('should display error state when API fails', async () => {
    const errorMock = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('API Error'),
        }),
      }),
    }

    mockSupabase.from.mockReturnValue(errorMock)

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getByText('Error loading balances')).toBeInTheDocument()
      expect(screen.getByText('API Error')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('should refresh balances when refresh button is clicked', async () => {
    setupSuccessfulMocks()

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    // Setup mocks for refresh call
    setupSuccessfulMocks()

    // Click refresh button
    const refreshButton = screen.getByText('Refresh')

    await act(async () => {
      fireEvent.click(refreshButton)
    })

    // Verify refresh was called (check that from is called again)
    // Initial load: 3 calls, refresh: 3 more calls = 6 total
    expect(mockSupabase.from).toHaveBeenCalledTimes(6)
  })

  it('should handle no expenses scenario correctly', async () => {
    // Mock group members query
    const membersMock = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockGroupMembers,
          error: null,
        }),
      }),
    }

    // Mock empty expenses query
    const emptyExpensesMock = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    }

    mockSupabase.from.mockReturnValueOnce(membersMock).mockReturnValueOnce(emptyExpensesMock)

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      expect(screen.getByText('Charlie Wilson')).toBeInTheDocument()
    })

    // All balances should be settled (since no expenses)
    const settledTexts = screen.getAllByText('Settled up')
    expect(settledTexts.length).toBeGreaterThan(2) // At least 3 balance items + 1 legend = 4+
  })

  it('should show correct visual indicators for different balance types', async () => {
    setupSuccessfulMocks()

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    // Check for balance breakdown information
    expect(screen.getByText(/Paid: \$30\.00 • Share: \$30\.00/)).toBeInTheDocument() // Alice
    expect(screen.getByText(/Paid: \$60\.00 • Share: \$40\.00/)).toBeInTheDocument() // Bob
    expect(screen.getByText(/Paid: \$0\.00 • Share: \$20\.00/)).toBeInTheDocument() // Charlie
  })

  it('should handle placeholder members correctly', async () => {
    setupSuccessfulMocks()

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getByText('Charlie Wilson')).toBeInTheDocument()
    })

    // Check that placeholder member has Guest badge
    expect(screen.getByText('Guest')).toBeInTheDocument()
  })
})
