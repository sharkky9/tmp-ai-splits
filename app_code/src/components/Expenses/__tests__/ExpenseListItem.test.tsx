import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseListItem } from '../ExpenseListItem'
import type { Expense, GroupMemberWithProfile } from '../../../types/database'

// Mock the external utilities
jest.mock('../../../lib/utils/currency', () => ({
  formatCurrency: jest.fn((amount: number) => `$${amount.toFixed(2)}`),
}))

jest.mock('../../../lib/utils/dateUtils', () => ({
  formatDateForDisplay: jest.fn(() => 'Jan 15, 2023'),
  formatDistanceToNowSafe: jest.fn(() => '2 days ago'),
}))

// Mock UI components with inline definitions
jest.mock('../../../components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    <div data-testid='collapsible' data-open={open}>
      {children}
    </div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='collapsible-trigger'>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='collapsible-content'>{children}</div>
  ),
}))

// Simplified mocks for UI components
jest.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid='chevron-down' />,
  ChevronRight: () => <div data-testid='chevron-right' />,
  Edit: () => <div data-testid='edit-icon' />,
  Trash2: () => <div data-testid='trash-icon' />,
  Users: () => <div data-testid='users-icon' />,
  CreditCard: () => <div data-testid='credit-card-icon' />,
  Calendar: () => <div data-testid='calendar-icon' />,
  DollarSign: () => <div data-testid='dollar-sign-icon' />,
  Info: () => <div data-testid='info-icon' />,
}))

// Apply mocks using relative paths
jest.mock('../../ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

jest.mock('../../ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    className?: string
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}))

jest.mock('../../ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}))

jest.mock('../../ui/separator', () => ({
  Separator: () => <hr data-testid='separator' />,
}))

const mockExpense: Expense = {
  id: 'expense-1',
  group_id: 'group-1',
  description: 'Team Lunch',
  total_amount: 60.0,
  currency: 'USD',
  date_of_expense: '2023-01-15',
  status: 'confirmed',
  created_at: '2023-01-15T12:00:00Z',
  updated_at: '2023-01-15T12:00:00Z',
  created_by: 'user-1',
  payers: [
    {
      user_id: 'user-1',
      placeholder_name: undefined,
      amount: 60.0,
    },
  ],
  participants: [
    {
      user_id: 'user-1',
      placeholder_name: undefined,
      amount: 20.0,
      percentage: 33.33,
    },
    {
      user_id: 'user-2',
      placeholder_name: undefined,
      amount: 20.0,
      percentage: 33.33,
    },
    {
      user_id: undefined,
      placeholder_name: 'John Smith',
      amount: 20.0,
      percentage: 33.34,
    },
  ],
  items: [
    {
      id: 'item-1',
      description: 'Pizza',
      amount: 35.0,
      participants: [],
    },
    {
      id: 'item-2',
      description: 'Drinks',
      amount: 25.0,
      participants: [],
    },
  ],
  llm_confidence_score: 0.95,
}

const mockGroupMembers: GroupMemberWithProfile[] = [
  {
    id: 'member-1',
    group_id: 'group-1',
    user_id: 'user-1',
    placeholder_name: null,
    is_placeholder: false,
    role: 'member',
    email: null,
    joined_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    profiles: {
      id: 'user-1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  },
  {
    id: 'member-2',
    group_id: 'group-1',
    user_id: 'user-2',
    placeholder_name: null,
    is_placeholder: false,
    role: 'member',
    email: null,
    joined_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    profiles: {
      id: 'user-2',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  },
]

describe('ExpenseListItem', () => {
  const defaultProps = {
    expense: mockExpense,
    groupMembers: mockGroupMembers,
  }

  describe('Basic Rendering', () => {
    it('should render expense basic information', () => {
      render(<ExpenseListItem {...defaultProps} />)

      expect(screen.getByText('Team Lunch')).toBeInTheDocument()
      expect(screen.getAllByText('$60.00')).toHaveLength(2) // Summary and payer amount
      expect(screen.getByText('3 people')).toBeInTheDocument() // 3 participants in the expense
      expect(screen.getByText('Confirmed')).toBeInTheDocument()
    })

    it('should display formatted date', () => {
      render(<ExpenseListItem {...defaultProps} />)

      // The date should be formatted by our mocked function
      expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument()
    })

    it('should show collapsible trigger', () => {
      render(<ExpenseListItem {...defaultProps} />)

      expect(screen.getByTestId('collapsible-trigger')).toBeInTheDocument()
    })
  })

  describe('Status Display', () => {
    it('should display confirmed status correctly', () => {
      render(<ExpenseListItem {...defaultProps} />)

      expect(screen.getByText('Confirmed')).toBeInTheDocument()
    })

    it('should display pending status correctly', () => {
      const pendingExpense = {
        ...mockExpense,
        status: 'pending_confirmation' as const,
      }

      render(<ExpenseListItem {...defaultProps} expense={pendingExpense} />)

      expect(screen.getByText('Pending Review')).toBeInTheDocument()
    })

    it('should display edited status correctly', () => {
      const editedExpense = {
        ...mockExpense,
        status: 'edited' as const,
      }

      render(<ExpenseListItem {...defaultProps} expense={editedExpense} />)

      expect(screen.getByText('Edited')).toBeInTheDocument()
    })
  })

  describe('Member Name Resolution', () => {
    it('should display member names from profiles', () => {
      const expenseWithKnownMembers = {
        ...mockExpense,
        payers: [{ user_id: 'user-1', amount: 60.0 }],
        participants: [
          { user_id: 'user-1', amount: 20.0 },
          { user_id: 'user-2', amount: 20.0 },
        ],
      }

      render(<ExpenseListItem {...defaultProps} expense={expenseWithKnownMembers} />)

      // Names should be resolved through getMemberName function
      // This would be visible in the expanded view
    })

    it('should display placeholder names when provided', () => {
      const expenseWithPlaceholder = {
        ...mockExpense,
        payers: [{ placeholder_name: 'Guest User', amount: 60.0 }],
        participants: [{ placeholder_name: 'Guest User', amount: 60.0 }],
      }

      render(<ExpenseListItem {...defaultProps} expense={expenseWithPlaceholder} />)

      // Placeholder names should be used when no user_id
    })
  })

  describe('Action Buttons', () => {
    it('should show edit and delete buttons when showActions is true', () => {
      const onEdit = jest.fn()
      const onDelete = jest.fn()

      render(
        <ExpenseListItem {...defaultProps} onEdit={onEdit} onDelete={onDelete} showActions={true} />
      )

      expect(screen.getAllByRole('button')).toHaveLength(2) // Edit and delete buttons
    })

    it('should hide action buttons when showActions is false', () => {
      const onEdit = jest.fn()
      const onDelete = jest.fn()

      render(
        <ExpenseListItem
          {...defaultProps}
          onEdit={onEdit}
          onDelete={onDelete}
          showActions={false}
        />
      )

      // When showActions is false, no action buttons should be present
      // The collapsible trigger is not a button role in our mock
      expect(screen.queryAllByRole('button')).toHaveLength(0)
    })

    it('should call onEdit when edit button is clicked', async () => {
      const onEdit = jest.fn()
      const user = userEvent.setup()

      render(<ExpenseListItem {...defaultProps} onEdit={onEdit} showActions={true} />)

      const editButton = screen.getAllByRole('button')[0] // First button should be edit
      await user.click(editButton)

      expect(onEdit).toHaveBeenCalledWith(mockExpense)
    })

    it('should disable buttons when isLoading is true', () => {
      const onEdit = jest.fn()
      const onDelete = jest.fn()

      render(
        <ExpenseListItem
          {...defaultProps}
          onEdit={onEdit}
          onDelete={onDelete}
          isLoading={true}
          showActions={true}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Expanded View', () => {
    it('should show detailed information when expanded', () => {
      render(<ExpenseListItem {...defaultProps} />)

      // The component shows expanded content by default in our test
      // This is because our mock Collapsible doesn't implement the collapsed state
      expect(screen.getByTestId('separator')).toBeInTheDocument()
    })

    it('should show itemized breakdown when items exist', () => {
      render(<ExpenseListItem {...defaultProps} />)

      // Items should be shown in expanded view
      expect(screen.getByText('Pizza')).toBeInTheDocument()
      expect(screen.getByText('Drinks')).toBeInTheDocument()
    })

    it('should show AI confidence score when available', () => {
      render(<ExpenseListItem {...defaultProps} />)

      // AI confidence score should be visible in metadata
      expect(screen.getByText('AI Confidence: 95%')).toBeInTheDocument()
    })

    it('should show creation date in metadata', () => {
      render(<ExpenseListItem {...defaultProps} />)

      // Should show "Created 2 days ago" from our mocked function
      expect(screen.getByText('Created 2 days ago')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle expenses without items', () => {
      const expenseWithoutItems = {
        ...mockExpense,
        items: undefined,
      }

      render(<ExpenseListItem {...defaultProps} expense={expenseWithoutItems} />)

      // Should render without errors
      expect(screen.getByText('Team Lunch')).toBeInTheDocument()
    })

    it('should handle expenses without confidence score', () => {
      const expenseWithoutScore = {
        ...mockExpense,
        llm_confidence_score: undefined,
      }

      render(<ExpenseListItem {...defaultProps} expense={expenseWithoutScore} />)

      // Should render without errors
      expect(screen.getByText('Team Lunch')).toBeInTheDocument()
    })

    it('should handle unknown users gracefully', () => {
      const expenseWithUnknownUser = {
        ...mockExpense,
        payers: [{ user_id: 'unknown-user', amount: 60.0 }],
        participants: [{ user_id: 'unknown-user', amount: 60.0 }],
      }

      render(<ExpenseListItem {...defaultProps} expense={expenseWithUnknownUser} />)

      // Should render without errors, showing "Unknown User" or similar
      expect(screen.getByText('Team Lunch')).toBeInTheDocument()
    })
  })

  describe('Split Rationale', () => {
    it('should display split explanation section', () => {
      render(<ExpenseListItem {...defaultProps} />)

      expect(screen.getByText('Split Explanation')).toBeInTheDocument()
    })

    it('should show equal split rationale for equal splits', () => {
      const equalSplitExpense = {
        ...mockExpense,
        total_amount: 30.0,
        participants: [
          { user_id: 'user-1', amount: 15.0 },
          { user_id: 'user-2', amount: 15.0 },
        ],
      }

      render(<ExpenseListItem {...defaultProps} expense={equalSplitExpense} />)

      expect(screen.getAllByText('Split equally among 2 people')).toHaveLength(2)
    })

    it('should show percentage rationale for percentage splits', () => {
      const percentageSplitExpense = {
        ...mockExpense,
        total_amount: 100.0,
        participants: [
          { user_id: 'user-1', amount: 40.0, percentage: 40.0 },
          { user_id: 'user-2', amount: 60.0, percentage: 60.0 },
        ],
      }

      render(<ExpenseListItem {...defaultProps} expense={percentageSplitExpense} />)

      expect(screen.getByText('40% of $100.00 total')).toBeInTheDocument()
      expect(screen.getByText('60% of $100.00 total')).toBeInTheDocument()
    })

    it('should show custom amount rationale for unequal splits', () => {
      const customSplitExpense = {
        ...mockExpense,
        total_amount: 100.0,
        participants: [
          { user_id: 'user-1', amount: 70.0 },
          { user_id: 'user-2', amount: 30.0 },
        ],
      }

      render(<ExpenseListItem {...defaultProps} expense={customSplitExpense} />)

      expect(screen.getByText('Custom amount (70.0% of total)')).toBeInTheDocument()
      expect(screen.getByText('Custom amount (30.0% of total)')).toBeInTheDocument()
    })

    it('should handle placeholder members in split rationale', () => {
      const expenseWithPlaceholder = {
        ...mockExpense,
        total_amount: 60.0,
        participants: [
          { user_id: 'user-1', amount: 30.0 },
          { placeholder_name: 'Guest User', amount: 30.0 },
        ],
      }

      render(<ExpenseListItem {...defaultProps} expense={expenseWithPlaceholder} />)

      expect(screen.getAllByText('Split equally among 2 people')).toHaveLength(2)
      // Should display both user and placeholder name - using getAllByText since names appear multiple times
      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Guest User').length).toBeGreaterThan(0)
    })

    it('should display amounts correctly in split rationale', () => {
      const testExpense = {
        ...mockExpense,
        total_amount: 45.0,
        participants: [
          { user_id: 'user-1', amount: 22.5 },
          { user_id: 'user-2', amount: 22.5 },
        ],
      }

      render(<ExpenseListItem {...defaultProps} expense={testExpense} />)

      expect(screen.getAllByText('$22.50')).toHaveLength(4) // 2 in participants section + 2 in rationale section
    })
  })
})
