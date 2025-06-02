import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManualExpenseForm } from '../ManualExpenseForm'
import { CreateExpenseRequest } from '../../../types/database'

// Mock dependencies
jest.mock('../../../hooks/useExpenses', () => ({
  useCreateExpense: () => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  }),
}))

// Mock group members for testing
const mockGroupMembers = [
  {
    id: 'member-1',
    user_id: 'user-1',
    placeholder_name: null,
    is_placeholder: false,
    name: 'John Smith',
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    placeholder_name: null,
    is_placeholder: false,
    name: 'Jane Doe',
  },
  {
    id: 'member-3',
    user_id: null,
    placeholder_name: 'Bob Wilson',
    is_placeholder: true,
    name: 'Bob Wilson',
  },
]

const defaultProps = {
  groupId: 'test-group-id',
  groupMembers: mockGroupMembers,
  onClose: jest.fn(),
  onSubmit: jest.fn(),
}

describe('ManualExpenseForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('should render all required form fields', () => {
      render(<ManualExpenseForm {...defaultProps} />)

      // Basic expense fields
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/who paid/i)).toBeInTheDocument()

      // Split method selection
      expect(screen.getByLabelText(/split method/i)).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /equal split/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /custom amounts/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /percentages/i })).toBeInTheDocument()

      // Participants section
      expect(screen.getByText(/participants/i)).toBeInTheDocument()

      // Action buttons
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create expense/i })).toBeInTheDocument()
    })

    it('should render group members as participant options', () => {
      render(<ManualExpenseForm {...defaultProps} />)

      // Check that all group members appear as checkboxes
      expect(screen.getByLabelText(/john smith/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/jane doe/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/bob wilson/i)).toBeInTheDocument()
    })

    it('should show payer dropdown with group members', () => {
      render(<ManualExpenseForm {...defaultProps} />)

      const payerSelect = screen.getByLabelText(/who paid/i)
      fireEvent.click(payerSelect)

      expect(screen.getByRole('option', { name: /john smith/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /jane doe/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /bob wilson/i })).toBeInTheDocument()
    })

    it('should pre-populate with initial data when provided', () => {
      const initialData: Partial<CreateExpenseRequest> = {
        description: 'Test expense',
        total_amount: 50.0,
        category: 'food',
        split_method: 'amount',
      }

      render(<ManualExpenseForm {...defaultProps} initialData={initialData} />)

      expect(screen.getByDisplayValue('Test expense')).toBeInTheDocument()
      expect(screen.getByDisplayValue('50')).toBeInTheDocument()
      expect(screen.getByDisplayValue('food')).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /custom amounts/i })).toBeChecked()
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create expense/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
        expect(screen.getByText(/payer is required/i)).toBeInTheDocument()
        expect(screen.getByText(/at least one participant/i)).toBeInTheDocument()
      })
    })

    it('should validate amount is a positive number', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)

      // Test negative amount
      await user.type(amountInput, '-10')
      await user.tab() // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument()
      })

      // Test zero amount
      await user.clear(amountInput)
      await user.type(amountInput, '0')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument()
      })
    })

    it('should validate custom amounts sum to total', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      // Fill basic fields
      await user.type(screen.getByLabelText(/description/i), 'Test expense')
      await user.type(screen.getByLabelText(/amount/i), '100')

      // Select custom amounts
      await user.click(screen.getByRole('radio', { name: /custom amounts/i }))

      // Select participants
      await user.click(screen.getByLabelText(/john smith/i))
      await user.click(screen.getByLabelText(/jane doe/i))

      // Wait for custom amount inputs to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/john smith amount/i)).toBeInTheDocument()
      })

      // Enter amounts that don't sum to total
      await user.type(screen.getByLabelText(/john smith amount/i), '30')
      await user.type(screen.getByLabelText(/jane doe amount/i), '40') // Total 70, should be 100

      const submitButton = screen.getByRole('button', { name: /create expense/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/amounts must sum to total/i)).toBeInTheDocument()
      })
    })

    it('should validate percentages sum to 100%', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      // Fill basic fields
      await user.type(screen.getByLabelText(/description/i), 'Test expense')
      await user.type(screen.getByLabelText(/amount/i), '100')

      // Select percentages
      await user.click(screen.getByRole('radio', { name: /percentages/i }))

      // Select participants
      await user.click(screen.getByLabelText(/john smith/i))
      await user.click(screen.getByLabelText(/jane doe/i))

      // Wait for percentage inputs to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/john smith percentage/i)).toBeInTheDocument()
      })

      // Enter percentages that don't sum to 100%
      await user.type(screen.getByLabelText(/john smith percentage/i), '60')
      await user.type(screen.getByLabelText(/jane doe percentage/i), '50') // Total 110%, should be 100%

      const submitButton = screen.getByRole('button', { name: /create expense/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/percentages must sum to 100/i)).toBeInTheDocument()
      })
    })
  })

  describe('Split Method Interactions', () => {
    it('should show equal split with no additional inputs by default', () => {
      render(<ManualExpenseForm {...defaultProps} />)

      expect(screen.getByRole('radio', { name: /equal split/i })).toBeChecked()

      // Should not show amount or percentage inputs initially
      expect(
        screen.queryByLabelText(/amount/i, {
          selector: 'input[type="number"]:not([name="total_amount"])',
        })
      ).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/percentage/i)).not.toBeInTheDocument()
    })

    it('should show custom amount inputs when custom amounts selected', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      // Select participants first
      await user.click(screen.getByLabelText(/john smith/i))
      await user.click(screen.getByLabelText(/jane doe/i))

      // Select custom amounts
      await user.click(screen.getByRole('radio', { name: /custom amounts/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/john smith amount/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/jane doe amount/i)).toBeInTheDocument()
      })
    })

    it('should show percentage inputs when percentages selected', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      // Select participants first
      await user.click(screen.getByLabelText(/john smith/i))
      await user.click(screen.getByLabelText(/jane doe/i))

      // Select percentages
      await user.click(screen.getByRole('radio', { name: /percentages/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/john smith percentage/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/jane doe percentage/i)).toBeInTheDocument()
      })
    })

    it('should calculate equal splits preview', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      // Fill amount
      await user.type(screen.getByLabelText(/amount/i), '30')

      // Select participants
      await user.click(screen.getByLabelText(/john smith/i))
      await user.click(screen.getByLabelText(/jane doe/i))
      await user.click(screen.getByLabelText(/bob wilson/i))

      // Should show equal split preview
      await waitFor(() => {
        expect(screen.getByText(/\$10\.00 each/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with correct data for equal split', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()

      render(<ManualExpenseForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill form
      await user.type(screen.getByLabelText(/description/i), 'Team dinner')
      await user.type(screen.getByLabelText(/amount/i), '60')

      // Select payer
      await user.selectOptions(screen.getByLabelText(/who paid/i), 'member-1')

      // Select participants
      await user.click(screen.getByLabelText(/john smith/i))
      await user.click(screen.getByLabelText(/jane doe/i))

      // Submit form
      await user.click(screen.getByRole('button', { name: /create expense/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Team dinner',
            total_amount: 60,
            payer_id: 'member-1',
            split_method: 'equal',
            participants: expect.arrayContaining([
              expect.objectContaining({ member_id: 'member-1' }),
              expect.objectContaining({ member_id: 'member-2' }),
            ]),
          })
        )
      })
    })

    it('should call onSubmit with custom amounts', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()

      render(<ManualExpenseForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill form
      await user.type(screen.getByLabelText(/description/i), 'Groceries')
      await user.type(screen.getByLabelText(/amount/i), '50')

      // Select payer
      await user.selectOptions(screen.getByLabelText(/who paid/i), 'member-1')

      // Select custom amounts
      await user.click(screen.getByRole('radio', { name: /custom amounts/i }))

      // Select participants
      await user.click(screen.getByLabelText(/john smith/i))
      await user.click(screen.getByLabelText(/jane doe/i))

      // Fill custom amounts
      await waitFor(() => {
        expect(screen.getByLabelText(/john smith amount/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/john smith amount/i), '30')
      await user.type(screen.getByLabelText(/jane doe amount/i), '20')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create expense/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            split_method: 'amount',
            participants: expect.arrayContaining([
              expect.objectContaining({ member_id: 'member-1', split_amount: 30 }),
              expect.objectContaining({ member_id: 'member-2', split_amount: 20 }),
            ]),
          })
        )
      })
    })

    it('should call onClose when cancel button clicked', async () => {
      const user = userEvent.setup()
      const mockOnClose = jest.fn()

      render(<ManualExpenseForm {...defaultProps} onClose={mockOnClose} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('should disable submit button while loading', () => {
      // Mock loading state
      jest.mocked(require('../../../hooks/useExpenses').useCreateExpense).mockReturnValue({
        mutate: jest.fn(),
        isLoading: true,
        error: null,
      })

      render(<ManualExpenseForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /creating/i })
      expect(submitButton).toBeDisabled()
    })

    it('should show error message when submission fails', () => {
      // Mock error state
      jest.mocked(require('../../../hooks/useExpenses').useCreateExpense).mockReturnValue({
        mutate: jest.fn(),
        isLoading: false,
        error: { message: 'Failed to create expense' },
      })

      render(<ManualExpenseForm {...defaultProps} />)

      expect(screen.getByText(/failed to create expense/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and structure', () => {
      render(<ManualExpenseForm {...defaultProps} />)

      // Check that form has proper structure
      expect(screen.getByRole('form')).toBeInTheDocument()

      // Check that all inputs have labels
      const inputs = screen.getAllByRole('textbox')
      inputs.forEach((input) => {
        expect(input).toHaveAccessibleName()
      })

      // Check radio groups
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      const descriptionInput = screen.getByLabelText(/description/i)

      // Tab through form elements
      await user.tab()
      expect(descriptionInput).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/amount/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/date/i)).toHaveFocus()
    })
  })
})
