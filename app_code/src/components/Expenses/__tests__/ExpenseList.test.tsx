import React from 'react'
import { render, screen } from '@testing-library/react'
import { ExpenseList } from '../ExpenseList'

// Mock dependencies
const mockUseExpenses = jest.fn()

jest.mock('../../../hooks/useExpenses', () => ({
  useExpenses: (groupId: string) => mockUseExpenses(groupId),
}))

// Mock ExpenseListItem component
jest.mock('../ExpenseListItem', () => ({
  ExpenseListItem: ({ expense }: { expense: any }) => (
    <div data-testid={`expense-item-${expense.id}`}>
      {expense.description} - ${expense.total_amount}
    </div>
  ),
}))

const mockExpenses = [
  {
    id: 'expense-1',
    description: 'Team dinner',
    total_amount: 120.5,
    currency: 'USD',
    date_of_expense: '2024-01-15',
    status: 'confirmed',
    expense_splits: [
      { id: 'split-1', member_id: 'member-1', user_id: 'user-1', amount: 60.25 },
      { id: 'split-2', member_id: 'member-2', user_id: 'user-2', amount: 60.25 },
    ],
  },
  {
    id: 'expense-2',
    description: 'Office supplies',
    total_amount: 45.0,
    currency: 'USD',
    date_of_expense: '2024-01-16',
    status: 'pending_confirmation',
    expense_splits: [{ id: 'split-3', member_id: 'member-1', user_id: 'user-1', amount: 45.0 }],
  },
]

describe('ExpenseList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading message when expenses are being fetched', () => {
      mockUseExpenses.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      })

      render(<ExpenseList groupId='test-group-id' />)

      expect(screen.getByText('Loading expenses...')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should show error message when expense fetching fails', () => {
      const errorMessage = 'Failed to fetch expenses'
      mockUseExpenses.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: errorMessage },
      })

      render(<ExpenseList groupId='test-group-id' />)

      expect(screen.getByText(`Error loading expenses: ${errorMessage}`)).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty message when no expenses exist', () => {
      mockUseExpenses.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      render(<ExpenseList groupId='test-group-id' />)

      expect(screen.getByText('No expenses found for this group.')).toBeInTheDocument()
    })

    it('should show empty message when expenses data is null', () => {
      mockUseExpenses.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      })

      render(<ExpenseList groupId='test-group-id' />)

      expect(screen.getByText('No expenses found for this group.')).toBeInTheDocument()
    })
  })

  describe('Success State', () => {
    beforeEach(() => {
      mockUseExpenses.mockReturnValue({
        data: mockExpenses,
        isLoading: false,
        error: null,
      })
    })

    it('should render list of expenses when data is available', () => {
      render(<ExpenseList groupId='test-group-id' />)

      expect(screen.getByText('Expenses')).toBeInTheDocument()
      expect(screen.getByTestId('expense-item-expense-1')).toBeInTheDocument()
      expect(screen.getByTestId('expense-item-expense-2')).toBeInTheDocument()
    })

    it('should pass each expense to ExpenseListItem', () => {
      render(<ExpenseList groupId='test-group-id' />)

      expect(screen.getByText('Team dinner - $120.5')).toBeInTheDocument()
      expect(screen.getByText('Office supplies - $45')).toBeInTheDocument()
    })

    it('should call useExpenses hook with correct groupId', () => {
      render(<ExpenseList groupId='test-group-id' />)

      expect(mockUseExpenses).toHaveBeenCalledWith('test-group-id')
    })
  })

  describe('Props', () => {
    it('should handle different groupId values', () => {
      mockUseExpenses.mockReturnValue({
        data: mockExpenses,
        isLoading: false,
        error: null,
      })

      const { rerender } = render(<ExpenseList groupId='group-1' />)
      expect(mockUseExpenses).toHaveBeenCalledWith('group-1')

      rerender(<ExpenseList groupId='group-2' />)
      expect(mockUseExpenses).toHaveBeenCalledWith('group-2')
    })
  })
})
