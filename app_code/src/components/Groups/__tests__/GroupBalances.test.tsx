import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GroupBalances from '../GroupBalances'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import * as balanceUtils from '../../../lib/balanceUtils'
import * as expenseUtils from '../../../lib/expenseUtils'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(),
}))

// Mock the balance utilities
jest.mock('../../../lib/balanceUtils', () => ({
  formatBalance: jest.fn((amount: number) => {
    if (amount > 0.01) return `Gets back $${amount.toFixed(2)}`
    if (amount < -0.01) return `Owes $${Math.abs(amount).toFixed(2)}`
    return 'Settled up'
  }),
  calculateGroupBalances: jest.fn(() => [
    {
      member_id: 'member-1',
      user_id: 'user-1',
      name: 'Alice Smith',
      total_paid: 30,
      total_share: 30,
      net_balance: 0,
      is_placeholder: false,
    },
    {
      member_id: 'member-2',
      user_id: 'user-2',
      name: 'Bob Johnson',
      total_paid: 60,
      total_share: 40,
      net_balance: 20,
      is_placeholder: false,
    },
    {
      member_id: 'member-3',
      user_id: undefined,
      name: 'Charlie Wilson',
      total_paid: 0,
      total_share: 20,
      net_balance: -20,
      is_placeholder: true,
    },
  ]),
  sortBalancesByAmount: jest.fn((balances) =>
    [...balances].sort((a, b) => b.net_balance - a.net_balance)
  ),
}))

// Mock the expense utilities
jest.mock('../../../lib/expenseUtils', () => ({
  simplifyDebts: jest.fn(() => [
    {
      from_member_id: 'member-3',
      from_name: 'Charlie Wilson',
      to_member_id: 'member-2',
      to_name: 'Bob Johnson',
      amount: 20,
    },
  ]),
  formatCurrency: jest.fn((amount: number) => `$${amount.toFixed(2)}`),
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
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  function createMockSupabaseClient() {
    return {
      from: jest.fn(),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    mockSupabase = createMockSupabaseClient()
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
    // Create mock chain for group members
    const membersMockChain = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockGroupMembers,
          error: null,
        }),
      }),
    }

    // Create mock chain for expenses
    const expensesMockChain = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockExpenses,
            error: null,
          }),
        }),
      }),
    }

    // Create mock chain for expense splits
    const splitsMockChain = {
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: mockExpenseSplits,
          error: null,
        }),
      }),
    }

    // Setup the from() method to return appropriate mocks for each table
    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'group_members':
          return membersMockChain
        case 'expenses':
          return expensesMockChain
        case 'expense_splits':
          return splitsMockChain
        default:
          return membersMockChain
      }
    })
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
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Bob Johnson').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Charlie Wilson').length).toBeGreaterThan(0)
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
    // Override mock to return empty balances
    ;(balanceUtils.calculateGroupBalances as jest.Mock).mockReturnValueOnce([])

    // Create mock chain for empty group members
    const emptyMembersMockChain = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    }

    // Create mock chain for empty expenses
    const emptyExpensesMockChain = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    }

    // Create mock chain for empty splits
    const emptySplitsMockChain = {
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    }

    // Setup the from() method to return empty mocks
    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'group_members':
          return emptyMembersMockChain
        case 'expenses':
          return emptyExpensesMockChain
        case 'expense_splits':
          return emptySplitsMockChain
        default:
          return emptyMembersMockChain
      }
    })

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      // Check for empty state message
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
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0)
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
    // Override mock to return all settled balances (no expenses = no debts)
    ;(balanceUtils.calculateGroupBalances as jest.Mock).mockReturnValueOnce([
      {
        member_id: 'member-1',
        user_id: 'user-1',
        name: 'Alice Smith',
        total_paid: 0,
        total_share: 0,
        net_balance: 0,
        is_placeholder: false,
      },
      {
        member_id: 'member-2',
        user_id: 'user-2',
        name: 'Bob Johnson',
        total_paid: 0,
        total_share: 0,
        net_balance: 0,
        is_placeholder: false,
      },
      {
        member_id: 'member-3',
        user_id: undefined,
        name: 'Charlie Wilson',
        total_paid: 0,
        total_share: 0,
        net_balance: 0,
        is_placeholder: true,
      },
    ])

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
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Bob Johnson').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Charlie Wilson').length).toBeGreaterThan(0)
    })

    // All balances should be settled (since no expenses)
    const settledTexts = screen.getAllByText('Settled up')
    expect(settledTexts.length).toBeGreaterThanOrEqual(3) // At least 3 balance items
  })

  it('should show correct visual indicators for different balance types', async () => {
    setupSuccessfulMocks()

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0)
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
      expect(screen.getAllByText('Charlie Wilson').length).toBeGreaterThan(0)
    })

    // Check that placeholder member has Guest badge
    expect(screen.getByText('Guest')).toBeInTheDocument()
  })

  it('should display settlement suggestions when there are debts to settle', async () => {
    setupSuccessfulMocks()

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getByText('Settlement Suggestions')).toBeInTheDocument()
    })

    // Check for specific settlement transaction (Charlie owes Bob $20)
    expect(
      screen.getByText('These 1 transactions will settle all debts in the group.')
    ).toBeInTheDocument()
  })

  it('should not display settlement suggestions when all balances are settled', async () => {
    // Override mocks for settled state
    ;(balanceUtils.calculateGroupBalances as jest.Mock).mockReturnValueOnce([
      {
        member_id: 'member-1',
        user_id: 'user-1',
        name: 'Alice Smith',
        total_paid: 0,
        total_share: 0,
        net_balance: 0,
        is_placeholder: false,
      },
      {
        member_id: 'member-2',
        user_id: 'user-2',
        name: 'Bob Johnson',
        total_paid: 0,
        total_share: 0,
        net_balance: 0,
        is_placeholder: false,
      },
      {
        member_id: 'member-3',
        user_id: undefined,
        name: 'Charlie Wilson',
        total_paid: 0,
        total_share: 0,
        net_balance: 0,
        is_placeholder: true,
      },
    ])

    // No debts to settle
    ;(expenseUtils.simplifyDebts as jest.Mock).mockReturnValueOnce([])

    // Mock group members query with all settled balances
    const settledMembersMock = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockGroupMembers,
          error: null,
        }),
      }),
    }

    // Mock empty expenses (which results in all $0 balances)
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

    mockSupabase.from.mockReturnValueOnce(settledMembersMock).mockReturnValueOnce(emptyExpensesMock)

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0)
    })

    // Settlement suggestions should not be shown when no debts exist
    expect(screen.queryByText('Settlement Suggestions')).not.toBeInTheDocument()
  })

  it('should display correct settlement transaction details', async () => {
    setupSuccessfulMocks()

    await act(async () => {
      renderComponent()
    })

    await waitFor(() => {
      expect(screen.getByText('Settlement Suggestions')).toBeInTheDocument()
    })

    // The settlement should show Charlie paying Bob (Charlie owes $20, Bob gets $20)
    // Look for both names in settlement suggestions section
    const settlementSuggestions = screen.getByText('Settlement Suggestions').closest('div')
    expect(settlementSuggestions).toBeInTheDocument()

    // Check that the settlement amount is displayed
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })
})
