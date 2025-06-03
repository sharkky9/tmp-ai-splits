import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManualExpenseForm } from '../ManualExpenseForm'
import { CreateExpenseRequest, SplitMethod } from '../../../types/database'

// Mock dependencies
const mockMutate = jest.fn()
const mockUseCreateExpense = jest.fn()

jest.mock('../../../hooks/useExpenses', () => ({
  useCreateExpense: () => mockUseCreateExpense(),
}))

// Mock group members for testing
const mockGroupMembers = [
  {
    id: 'member-1',
    user_id: 'user-1',
    placeholder_name: undefined,
    is_placeholder: false,
    name: 'John Smith',
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    placeholder_name: undefined,
    is_placeholder: false,
    name: 'Jane Doe',
  },
  {
    id: 'member-3',
    user_id: undefined,
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
    // Default mock return value
    mockUseCreateExpense.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    })
  })

  describe('Form Rendering', () => {
    it('should render all required form fields', () => {
      render(<ManualExpenseForm {...defaultProps} />)

      // Basic expense fields
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/amount \*/i)).toBeInTheDocument()
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
      expect(screen.getByRole('checkbox', { name: /john smith/i })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /jane doe/i })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /bob wilson guest/i })).toBeInTheDocument()
    })

    it('should show payer dropdown with group members', () => {
      render(<ManualExpenseForm {...defaultProps} />)

      const payerSelect = screen.getByLabelText(/who paid/i)
      expect(payerSelect).toBeInTheDocument()

      // Check the options are in the select
      expect(screen.getByRole('option', { name: /john smith/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /jane doe/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /bob wilson/i })).toBeInTheDocument()
    })

    it('should pre-populate with initial data when provided', () => {
      const initialData: Partial<CreateExpenseRequest> = {
        description: 'Test expense',
        total_amount: 50.0,
        category: 'food',
        split_method: SplitMethod.AMOUNT,
      }

      render(<ManualExpenseForm {...defaultProps} initialData={initialData} />)

      expect(screen.getByDisplayValue('Test expense')).toBeInTheDocument()
      expect(screen.getByDisplayValue('50')).toBeInTheDocument()
      // Check that the category select has the correct value selected
      const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement
      expect(categorySelect.value).toBe('food')
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
        expect(screen.getByText(/amount must be a positive number/i)).toBeInTheDocument()
        expect(screen.getByText(/payer is required/i)).toBeInTheDocument()
        expect(screen.getByText(/at least one participant/i)).toBeInTheDocument()
      })
    })

    it('should validate amount is a positive number', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /create expense/i })

      // Test with empty amount - this should show amount validation error
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/amount must be a positive number/i)).toBeInTheDocument()
      })
    })
  })

  describe('Split Method Interactions', () => {
    it('should show equal split with no additional inputs by default', () => {
      render(<ManualExpenseForm {...defaultProps} />)

      expect(screen.getByRole('radio', { name: /equal split/i })).toBeChecked()
      expect(
        screen.queryByLabelText(new RegExp(`${mockGroupMembers[0].name} amount`, 'i'))
      ).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText(new RegExp(`${mockGroupMembers[0].name} percentage`, 'i'))
      ).not.toBeInTheDocument()
    })

    it('should show custom amount inputs when custom amounts selected', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      // Select participants first
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))

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
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))

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
      await user.type(screen.getByLabelText(/amount \*/i), '30')

      // Select participants
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))
      await user.click(screen.getByRole('checkbox', { name: /bob wilson/i }))

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

      // Mock mutate to simulate successful submission
      mockMutate.mockImplementation((data, options) => {
        // Simulate successful response
        options?.onSuccess?.(data)
      })

      render(<ManualExpenseForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill required fields
      await user.type(screen.getByLabelText(/description/i), 'Team dinner')
      await user.type(screen.getByLabelText(/amount \*/i), '60')
      await user.selectOptions(screen.getByLabelText(/who paid/i), 'member-1')

      // Select participants
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))

      // Submit
      await user.click(screen.getByRole('button', { name: /create expense/i }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Team dinner',
            total_amount: 60,
            payer_id: 'member-1',
            split_method: 'equal',
            participants: expect.arrayContaining([
              expect.objectContaining({ member_id: 'member-1' }),
              expect.objectContaining({ member_id: 'member-2' }),
            ]),
          }),
          expect.any(Object)
        )
        expect(mockOnSubmit).toHaveBeenCalled()
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
      mockUseCreateExpense.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        error: null,
      })

      render(<ManualExpenseForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
    })

    it('should show error message when submission fails', () => {
      // Mock error state
      mockUseCreateExpense.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: { message: 'Failed to create expense' },
      })

      render(<ManualExpenseForm {...defaultProps} />)

      expect(screen.getByText(/failed to create expense/i)).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('should update form fields correctly', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      const descriptionInput = screen.getByLabelText(/description/i)
      await user.type(descriptionInput, 'Pizza party')

      expect(descriptionInput).toHaveValue('Pizza party')
    })
  })

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      const descriptionInput = screen.getByLabelText(/description/i)

      // Focus should start on first input
      descriptionInput.focus()
      expect(descriptionInput).toHaveFocus()

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/amount \*/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/date/i)).toHaveFocus()
    })

    it('should have proper ARIA labels', () => {
      render(<ManualExpenseForm {...defaultProps} />)

      // Split method radiogroup should have proper labeling
      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'aria-labelledby',
        'split-method-label'
      )

      // Form should have role
      expect(screen.getByRole('form')).toBeInTheDocument()
    })
  })

  describe('Integration Tests', () => {
    it('should submit expense using useCreateExpense hook when form is valid', async () => {
      const user = userEvent.setup()

      // Mock successful response from the hook
      mockUseCreateExpense.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      })

      // Mock mutate to simulate successful submission
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.(data)
      })

      const mockOnSubmit = jest.fn()
      render(<ManualExpenseForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill all required fields
      await user.type(screen.getByLabelText(/description/i), 'Team lunch')
      await user.type(screen.getByLabelText(/amount \*/i), '45.50')
      await user.selectOptions(screen.getByLabelText(/who paid/i), 'member-1')

      // Select participants for equal split
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create expense/i }))

      // Verify the mutate function was called with correct data
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            group_id: 'test-group-id',
            description: 'Team lunch',
            total_amount: 45.5,
            payer_id: 'member-1',
            split_method: 'equal',
            participants: expect.arrayContaining([
              expect.objectContaining({
                member_id: 'member-1',
                user_id: 'user-1',
              }),
              expect.objectContaining({
                member_id: 'member-2',
                user_id: 'user-2',
              }),
            ]),
          }),
          expect.any(Object)
        )
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('should validate equal split calculation in submission data', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()

      // Mock mutate to simulate successful submission
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.(data)
      })

      render(<ManualExpenseForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill form with specific amount for equal split test
      await user.type(screen.getByLabelText(/description/i), 'Pizza party')
      await user.type(screen.getByLabelText(/amount \*/i), '30')
      await user.selectOptions(screen.getByLabelText(/who paid/i), 'member-1')

      // Select 3 participants for equal split
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))
      await user.click(screen.getByRole('checkbox', { name: /bob wilson/i }))

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create expense/i }))

      // Verify the submission data structure
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            total_amount: 30,
            split_method: 'equal',
            participants: expect.arrayContaining([
              expect.objectContaining({ member_id: 'member-1' }),
              expect.objectContaining({ member_id: 'member-2' }),
              expect.objectContaining({ member_id: 'member-3' }),
            ]),
          }),
          expect.any(Object)
        )
      })

      // Verify the equal split calculation would be $10 each
      const submittedData = mockMutate.mock.calls[0][0]
      expect(submittedData.participants).toHaveLength(3)
      expect(submittedData.total_amount / submittedData.participants.length).toBe(10)
    })

    it('should submit expense with custom amount splits', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()

      // Mock mutate to simulate successful submission
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.(data)
      })

      render(<ManualExpenseForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill required fields
      await user.type(screen.getByLabelText(/description/i), 'Grocery shopping')
      await user.type(screen.getByLabelText(/amount \*/i), '100')
      await user.selectOptions(screen.getByLabelText(/who paid/i), 'member-1')

      // Select participants
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))

      // Switch to custom amounts
      await user.click(screen.getByRole('radio', { name: /custom amounts/i }))

      // Fill custom amounts
      await user.type(screen.getByLabelText(/john smith amount/i), '60')
      await user.type(screen.getByLabelText(/jane doe amount/i), '40')

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create expense/i }))

      // Verify the submission data
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            group_id: 'test-group-id',
            description: 'Grocery shopping',
            total_amount: 100,
            payer_id: 'member-1',
            split_method: 'amount',
            participants: expect.arrayContaining([
              expect.objectContaining({
                member_id: 'member-1',
                user_id: 'user-1',
                split_amount: 60,
              }),
              expect.objectContaining({
                member_id: 'member-2',
                user_id: 'user-2',
                split_amount: 40,
              }),
            ]),
          }),
          expect.any(Object)
        )
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('should submit expense with percentage splits', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()

      // Mock mutate to simulate successful submission
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.(data)
      })

      render(<ManualExpenseForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill required fields
      await user.type(screen.getByLabelText(/description/i), 'Utility bill')
      await user.type(screen.getByLabelText(/amount \*/i), '200')
      await user.selectOptions(screen.getByLabelText(/who paid/i), 'member-1')

      // Select participants
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))
      await user.click(screen.getByRole('checkbox', { name: /bob wilson/i }))

      // Switch to percentages
      await user.click(screen.getByRole('radio', { name: /percentages/i }))

      // Fill percentages that sum to 100%
      await user.type(screen.getByLabelText(/john smith percentage/i), '50')
      await user.type(screen.getByLabelText(/jane doe percentage/i), '30')
      await user.type(screen.getByLabelText(/bob wilson percentage/i), '20')

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create expense/i }))

      // Verify the submission data
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            group_id: 'test-group-id',
            description: 'Utility bill',
            total_amount: 200,
            payer_id: 'member-1',
            split_method: 'percentage',
            participants: expect.arrayContaining([
              expect.objectContaining({
                member_id: 'member-1',
                user_id: 'user-1',
                split_percentage: 50,
              }),
              expect.objectContaining({
                member_id: 'member-2',
                user_id: 'user-2',
                split_percentage: 30,
              }),
              expect.objectContaining({
                member_id: 'member-3',
                user_id: undefined, // Bob Wilson is a placeholder member
                placeholder_name: 'Bob Wilson',
                split_percentage: 20,
              }),
            ]),
          }),
          expect.any(Object)
        )
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('should prevent submission with invalid amount splits', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      // Fill required fields
      await user.type(screen.getByLabelText(/description/i), 'Invalid split test')
      await user.type(screen.getByLabelText(/amount \*/i), '100')
      await user.selectOptions(screen.getByLabelText(/who paid/i), 'member-1')

      // Select participants
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))

      // Switch to custom amounts
      await user.click(screen.getByRole('radio', { name: /custom amounts/i }))

      // Fill amounts that don't sum to total (only 80 instead of 100)
      await user.type(screen.getByLabelText(/john smith amount/i), '50')
      await user.type(screen.getByLabelText(/jane doe amount/i), '30')

      // Try to submit
      await user.click(screen.getByRole('button', { name: /create expense/i }))

      // Should show validation error and not call mutate
      await waitFor(() => {
        expect(screen.getByText(/amounts must sum to \$100\.00/i)).toBeInTheDocument()
        expect(mockMutate).not.toHaveBeenCalled()
      })
    })

    it('should prevent submission with invalid percentage splits', async () => {
      const user = userEvent.setup()
      render(<ManualExpenseForm {...defaultProps} />)

      // Fill required fields
      await user.type(screen.getByLabelText(/description/i), 'Invalid percentage test')
      await user.type(screen.getByLabelText(/amount \*/i), '100')
      await user.selectOptions(screen.getByLabelText(/who paid/i), 'member-1')

      // Select participants
      await user.click(screen.getByRole('checkbox', { name: /john smith/i }))
      await user.click(screen.getByRole('checkbox', { name: /jane doe/i }))

      // Switch to percentages
      await user.click(screen.getByRole('radio', { name: /percentages/i }))

      // Fill percentages that don't sum to 100% (only 80%)
      await user.type(screen.getByLabelText(/john smith percentage/i), '50')
      await user.type(screen.getByLabelText(/jane doe percentage/i), '30')

      // Try to submit
      await user.click(screen.getByRole('button', { name: /create expense/i }))

      // Should show validation error and not call mutate
      await waitFor(() => {
        expect(screen.getByText(/percentages must sum to 100%/i)).toBeInTheDocument()
        expect(mockMutate).not.toHaveBeenCalled()
      })
    })
  })
})
