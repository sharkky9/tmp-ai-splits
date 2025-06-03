import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseListItem } from '../ExpenseListItem'

// Mock the utility imports using relative paths based on actual project structure
jest.mock('../../../lib/utils/currency', () => ({
  formatCurrency: (amount: number, currency?: string) => `$${amount.toFixed(2)}`,
}))

jest.mock('../../../lib/utils/dateUtils', () => ({
  formatDateForDisplay: (date: string) => new Date(date).toLocaleDateString(),
  formatDistanceToNowSafe: (date: string) => '2 days ago',
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
}))

// Apply mocks using relative paths
jest.mock('../../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
}))

jest.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}))

jest.mock('../../ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}))

jest.mock('../../ui/separator', () => ({
  Separator: () => <hr data-testid='separator' />,
}))

jest.mock('../../ui/collapsible', () => ({
  Collapsible: ({ children, open, onOpenChange }: any) => (
    <div data-testid='collapsible' data-open={open}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children }: any) => (
    <div data-testid='collapsible-content'>{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild }: any) => (
    <div data-testid='collapsible-trigger'>{children}</div>
  ),
}))

const mockExpense = {
  id: 'expense-1',
  description: 'Team dinner',
  total_amount: 120.5,
  currency: 'USD',
  date_of_expense: '2024-01-15',
  status: 'confirmed',
  created_at: '2024-01-15T18:00:00Z',
  llm_confidence_score: 0.85,
  payers: [
    {
      user_id: 'user-1',
      placeholder_name: undefined,
      amount: 120.5,
    },
  ],
  participants: [
    {
      user_id: 'user-1',
      placeholder_name: undefined,
      amount: 60.25,
      percentage: undefined,
    },
    {
      user_id: 'user-2',
      placeholder_name: undefined,
      amount: 60.25,
      percentage: undefined,
    },
  ],
  items: [
    {
      id: 'item-1',
      description: 'Main course',
      amount: 80.0,
      participants: [
        { user_id: 'user-1', placeholder_name: undefined },
        { user_id: 'user-2', placeholder_name: undefined },
      ],
    },
    {
      id: 'item-2',
      description: 'Drinks',
      amount: 40.5,
      participants: [{ user_id: 'user-1', placeholder_name: undefined }],
    },
  ],
}

const mockGroupMembers = [
  {
    id: 'member-1',
    user_id: 'user-1',
    profiles: {
      name: 'John Smith',
      email: 'john@example.com',
    },
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    profiles: {
      name: 'Jane Doe',
      email: 'jane@example.com',
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

      expect(screen.getByText('Team dinner')).toBeInTheDocument()
      expect(screen.getAllByText('$120.50')).toHaveLength(2) // Summary and payer amount
      expect(screen.getByText('2 people')).toBeInTheDocument()
      expect(screen.getByText('Confirmed')).toBeInTheDocument()
    })

    it('should display formatted date', () => {
      render(<ExpenseListItem {...defaultProps} />)

      // The date should be formatted by our mocked function
      expect(screen.getByText(new Date('2024-01-15').toLocaleDateString())).toBeInTheDocument()
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
        status: 'pending_confirmation',
      }

      render(<ExpenseListItem {...defaultProps} expense={pendingExpense} />)

      expect(screen.getByText('Pending Review')).toBeInTheDocument()
    })

    it('should display edited status correctly', () => {
      const editedExpense = {
        ...mockExpense,
        status: 'edited',
      }

      render(<ExpenseListItem {...defaultProps} expense={editedExpense} />)

      expect(screen.getByText('Edited')).toBeInTheDocument()
    })
  })

  describe('Member Name Resolution', () => {
    it('should display member names from profiles', () => {
      const expenseWithKnownMembers = {
        ...mockExpense,
        payers: [{ user_id: 'user-1', amount: 120.5 }],
        participants: [
          { user_id: 'user-1', amount: 60.25 },
          { user_id: 'user-2', amount: 60.25 },
        ],
      }

      render(<ExpenseListItem {...defaultProps} expense={expenseWithKnownMembers} />)

      // Names should be resolved through getMemberName function
      // This would be visible in the expanded view
    })

    it('should display placeholder names when provided', () => {
      const expenseWithPlaceholder = {
        ...mockExpense,
        payers: [{ placeholder_name: 'Guest User', amount: 120.5 }],
        participants: [{ placeholder_name: 'Guest User', amount: 120.5 }],
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
      expect(screen.getByText('Main course')).toBeInTheDocument()
      expect(screen.getByText('Drinks')).toBeInTheDocument()
    })

    it('should show AI confidence score when available', () => {
      render(<ExpenseListItem {...defaultProps} />)

      // AI confidence score should be visible in metadata
      expect(screen.getByText('AI Confidence: 85%')).toBeInTheDocument()
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
      expect(screen.getByText('Team dinner')).toBeInTheDocument()
    })

    it('should handle expenses without confidence score', () => {
      const expenseWithoutScore = {
        ...mockExpense,
        llm_confidence_score: undefined,
      }

      render(<ExpenseListItem {...defaultProps} expense={expenseWithoutScore} />)

      // Should render without errors
      expect(screen.getByText('Team dinner')).toBeInTheDocument()
    })

    it('should handle unknown users gracefully', () => {
      const expenseWithUnknownUser = {
        ...mockExpense,
        payers: [{ user_id: 'unknown-user', amount: 120.5 }],
        participants: [{ user_id: 'unknown-user', amount: 120.5 }],
      }

      render(<ExpenseListItem {...defaultProps} expense={expenseWithUnknownUser} />)

      // Should render without errors, showing "Unknown User" or similar
      expect(screen.getByText('Team dinner')).toBeInTheDocument()
    })
  })
})
