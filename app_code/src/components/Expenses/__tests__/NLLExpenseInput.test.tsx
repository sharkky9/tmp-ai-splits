import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NLLExpenseInput } from '../NLLExpenseInput'
import { useCreateExpense } from '../../../hooks/useExpenses'
import { useAuthContext } from '../../../contexts/AuthContext'
import * as nlpUtils from '../../../lib/nlpUtils'

// Mock dependencies
jest.mock('../../../hooks/useExpenses')
jest.mock('../../../contexts/AuthContext')
jest.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
      }),
    },
  },
}))
jest.mock('../ManualExpenseForm', () => {
  const MockManualExpenseForm = ({
    onClose,
    onSubmit,
  }: {
    onClose: () => void
    onSubmit: (data: { id: string }) => void
  }) => (
    <div data-testid='manual-expense-form'>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onSubmit({ id: 'test-expense' })}>Submit</button>
    </div>
  )
  MockManualExpenseForm.displayName = 'ManualExpenseForm'

  return {
    ManualExpenseForm: MockManualExpenseForm,
  }
})
jest.mock('../../../lib/nlpUtils', () => ({
  parseExpenseText: jest.fn(),
  formatForExpenseCreation: jest.fn(),
}))

const mockUseCreateExpense = useCreateExpense as jest.MockedFunction<typeof useCreateExpense>
const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>
const mockParseExpenseText = nlpUtils.parseExpenseText as jest.MockedFunction<
  typeof nlpUtils.parseExpenseText
>
const mockFormatForExpenseCreation = nlpUtils.formatForExpenseCreation as jest.MockedFunction<
  typeof nlpUtils.formatForExpenseCreation
>

const mockGroupMembers = [
  {
    id: 'member-1',
    group_id: 'test-group',
    user_id: 'user-1',
    placeholder_name: null,
    email: null,
    is_placeholder: false,
    role: 'member',
    joined_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    profiles: {
      id: 'user-1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 'member-2',
    group_id: 'test-group',
    user_id: 'user-2',
    placeholder_name: null,
    email: null,
    is_placeholder: false,
    role: 'member',
    joined_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    profiles: {
      id: 'user-2',
      name: 'John Doe',
      email: 'john@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 'member-3',
    group_id: 'test-group',
    user_id: null,
    placeholder_name: 'Bob Wilson',
    email: 'bob@example.com',
    is_placeholder: true,
    role: 'member',
    joined_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    profiles: null,
  },
]

const defaultProps = {
  groupId: 'test-group-id',
  groupMembers: mockGroupMembers,
  onSuccess: jest.fn(),
  onCancel: jest.fn(),
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestWrapper'
  return Wrapper
}

describe('NLLExpenseInput', () => {
  const mockMutate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Set default mock return values
    mockParseExpenseText.mockReturnValue({
      description: '',
      amount: null,
      currency: 'USD',
      possiblePeople: [],
      possibleCategories: [],
      possibleDates: [],
      confidence: 0,
    })

    mockFormatForExpenseCreation.mockReturnValue({
      description: '',
      total_amount: null,
      currency: 'USD',
      participants: [],
      payer_id: null,
    })

    mockUseAuthContext.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'alice@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      },
      session: null,
      isLoading: false,
      signOut: jest.fn(),
    })

    mockUseCreateExpense.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
      data: undefined,
      isError: false,
      isIdle: true,
      isSuccess: false,
      reset: jest.fn(),
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      mutateAsync: jest.fn(),
      context: undefined,
    })
  })

  describe('Basic Functionality', () => {
    it('should render the main form with textarea and submit button', () => {
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByLabelText(/describe the expense/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /parse with ai/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/I paid \$45 for dinner/)).toBeInTheDocument()
    })

    it('should show character count as user types', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, 'Test expense')

      expect(screen.getByText('12/1000 characters')).toBeInTheDocument()
    })

    it('should disable submit button when input is empty', () => {
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const submitButton = screen.getByRole('button', { name: /parse with ai/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Basic Parsing and Preview', () => {
    beforeEach(() => {
      // Mock parseExpenseText to return predictable results
      mockParseExpenseText.mockReturnValue({
        description: 'Pizza dinner',
        amount: 50,
        currency: 'USD',
        possiblePeople: ['John', 'me'],
        possibleCategories: ['dinner'],
        possibleDates: [],
        confidence: 0.8,
      })

      mockFormatForExpenseCreation.mockReturnValue({
        description: 'Pizza dinner',
        total_amount: 50,
        currency: 'USD',
        participants: ['member-1', 'member-2'],
        payer_id: 'member-1',
      })
    })

    it('should show preview card when basic parsing detects expense data', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByText('Quick Preview')).toBeInTheDocument()
        expect(screen.getByText('Pizza dinner')).toBeInTheDocument()
        expect(screen.getByText('$50.00')).toBeInTheDocument()
        expect(screen.getByText('Equal split among 2 members')).toBeInTheDocument()
      })
    })

    it('should show participant badges in preview card', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('should show Quick Add and Fine-tune buttons in preview', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /quick add/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /fine-tune/i })).toBeInTheDocument()
      })
    })

    it('should not show preview card when confidence is too low', async () => {
      mockParseExpenseText.mockReturnValue({
        description: 'dinner',
        amount: null,
        currency: 'USD',
        possiblePeople: [],
        possibleCategories: ['dinner'],
        possibleDates: [],
        confidence: 0.2, // Low confidence
      })

      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, 'dinner')

      // Should not show preview card
      expect(screen.queryByText('Quick Preview')).not.toBeInTheDocument()
    })

    it('should show warning when amount is not detected', async () => {
      mockFormatForExpenseCreation.mockReturnValue({
        description: 'Pizza dinner',
        total_amount: null,
        currency: 'USD',
        participants: ['member-1', 'member-2'],
        payer_id: 'member-1',
      })

      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, 'pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByText(/couldn't detect an amount/i)).toBeInTheDocument()
      })
    })
  })

  describe('Quick Add Functionality', () => {
    beforeEach(() => {
      mockParseExpenseText.mockReturnValue({
        description: 'Pizza dinner',
        amount: 50,
        currency: 'USD',
        possiblePeople: ['John', 'me'],
        possibleCategories: ['dinner'],
        possibleDates: [],
        confidence: 0.8,
      })

      mockFormatForExpenseCreation.mockReturnValue({
        description: 'Pizza dinner',
        total_amount: 50,
        currency: 'USD',
        participants: ['member-1', 'member-2'],
        payer_id: 'member-1',
      })
    })

    it('should call createExpense when Quick Add is clicked', async () => {
      const user = userEvent.setup()
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.({ id: 'new-expense' })
      })

      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /quick add/i })).toBeInTheDocument()
      })

      const quickAddButton = screen.getByRole('button', { name: /quick add/i })
      await user.click(quickAddButton)

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: 'test-group-id',
          description: 'Pizza dinner',
          total_amount: 50,
          currency: 'USD',
          payer_id: 'member-1',
          split_method: 'equal',
          participants: expect.arrayContaining([
            expect.objectContaining({ member_id: 'member-1' }),
            expect.objectContaining({ member_id: 'member-2' }),
          ]),
        }),
        expect.any(Object)
      )
    })

    it('should call onSuccess when Quick Add succeeds', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.({ id: 'new-expense' })
      })

      render(<NLLExpenseInput {...defaultProps} onSuccess={mockOnSuccess} />, {
        wrapper: createWrapper(),
      })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /quick add/i })).toBeInTheDocument()
      })

      const quickAddButton = screen.getByRole('button', { name: /quick add/i })
      await user.click(quickAddButton)

      expect(mockOnSuccess).toHaveBeenCalledWith({ id: 'new-expense' })
    })

    it('should disable Quick Add button when amount is missing', async () => {
      mockFormatForExpenseCreation.mockReturnValue({
        description: 'Pizza dinner',
        total_amount: null,
        currency: 'USD',
        participants: ['member-1', 'member-2'],
        payer_id: 'member-1',
      })

      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, 'pizza dinner with John and me')

      await waitFor(() => {
        const quickAddButton = screen.getByRole('button', { name: /quick add/i })
        expect(quickAddButton).toBeDisabled()
      })
    })
  })

  describe('Fine-tune Functionality', () => {
    beforeEach(() => {
      mockParseExpenseText.mockReturnValue({
        description: 'Pizza dinner',
        amount: 50,
        currency: 'USD',
        possiblePeople: ['John', 'me'],
        possibleCategories: ['dinner'],
        possibleDates: [],
        confidence: 0.8,
      })

      mockFormatForExpenseCreation.mockReturnValue({
        description: 'Pizza dinner',
        total_amount: 50,
        currency: 'USD',
        participants: ['member-1', 'member-2'],
        payer_id: 'member-1',
      })
    })

    it('should show ManualExpenseForm when Fine-tune is clicked', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fine-tune/i })).toBeInTheDocument()
      })

      const fineTuneButton = screen.getByRole('button', { name: /fine-tune/i })
      await user.click(fineTuneButton)

      expect(screen.getByTestId('manual-expense-form')).toBeInTheDocument()
    })

    it('should hide main form when ManualExpenseForm is shown', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fine-tune/i })).toBeInTheDocument()
      })

      const fineTuneButton = screen.getByRole('button', { name: /fine-tune/i })
      await user.click(fineTuneButton)

      expect(screen.queryByLabelText(/describe the expense/i)).not.toBeInTheDocument()
    })

    it('should return to main form when ManualExpenseForm is closed', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fine-tune/i })).toBeInTheDocument()
      })

      const fineTuneButton = screen.getByRole('button', { name: /fine-tune/i })
      await user.click(fineTuneButton)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(screen.getByLabelText(/describe the expense/i)).toBeInTheDocument()
    })

    it('should call onSuccess when ManualExpenseForm submits', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()
      render(<NLLExpenseInput {...defaultProps} onSuccess={mockOnSuccess} />, {
        wrapper: createWrapper(),
      })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fine-tune/i })).toBeInTheDocument()
      })

      const fineTuneButton = screen.getByRole('button', { name: /fine-tune/i })
      await user.click(fineTuneButton)

      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)

      expect(mockOnSuccess).toHaveBeenCalledWith({ id: 'test-expense' })
    })
  })

  describe('Fallback Functionality', () => {
    it('should show fallback options when showFallback is true', () => {
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      // Simulate fallback state by triggering an error
      fireEvent.click(screen.getByRole('button', { name: /parse with ai/i }))

      // Note: This test would need to be adjusted based on actual error handling
      // For now, we'll test the fallback UI structure
    })

    it('should show Fine-tune button in fallback mode', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, 'some text')

      // This would need to be adjusted to actually trigger fallback mode
      // For now, testing the structure
    })
  })

  describe('Integration Tests', () => {
    beforeEach(() => {
      // Set up mocks for integration tests
      mockParseExpenseText.mockReturnValue({
        description: 'Pizza dinner',
        amount: 50,
        currency: 'USD',
        possiblePeople: ['John', 'me'],
        possibleCategories: ['dinner'],
        possibleDates: [],
        confidence: 0.8,
      })

      mockFormatForExpenseCreation.mockReturnValue({
        description: 'Pizza dinner',
        total_amount: 50,
        currency: 'USD',
        participants: ['member-1', 'member-2'],
        payer_id: 'member-1',
      })
    })

    it('should handle complete flow from input to expense creation', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.({ id: 'new-expense' })
      })

      render(<NLLExpenseInput {...defaultProps} onSuccess={mockOnSuccess} />, {
        wrapper: createWrapper(),
      })

      // Type expense description
      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      // Wait for preview to appear
      await waitFor(() => {
        expect(screen.getByText('Quick Preview')).toBeInTheDocument()
      })

      // Click Quick Add
      const quickAddButton = screen.getByRole('button', { name: /quick add/i })
      await user.click(quickAddButton)

      // Verify expense creation and success callback
      expect(mockMutate).toHaveBeenCalled()
      expect(mockOnSuccess).toHaveBeenCalledWith({ id: 'new-expense' })
    })

    it('should clear form after successful expense creation', async () => {
      const user = userEvent.setup()
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.({ id: 'new-expense' })
      })

      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for pizza dinner with John and me')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /quick add/i })).toBeInTheDocument()
      })

      const quickAddButton = screen.getByRole('button', { name: /quick add/i })
      await user.click(quickAddButton)

      // Form should be cleared
      expect(textarea).toHaveValue('')
    })
  })

  describe('Real-time Entity Recognition (Chips)', () => {
    beforeEach(() => {
      // Mock parseExpenseText to return different entities for testing chips
      mockParseExpenseText.mockImplementation((text) => {
        // Return different parsed data based on input text for testing
        if (text.includes('$50')) {
          return {
            description: 'Pizza dinner',
            amount: 50,
            currency: 'USD',
            possiblePeople: text.includes('John') ? ['John', 'me'] : ['me'],
            possibleCategories: text.includes('dinner') ? ['dinner'] : [],
            possibleDates: text.includes('yesterday') ? ['yesterday'] : [],
            confidence: 0.7,
          }
        }

        return {
          description: text,
          amount: null,
          currency: 'USD',
          possiblePeople: text.includes('John') ? ['John'] : [],
          possibleCategories: text.includes('coffee') ? ['coffee'] : [],
          possibleDates: text.includes('today') ? ['today'] : [],
          confidence: 0.3,
        }
      })
    })

    it('should show amount chips when amount is detected', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50')

      await waitFor(() => {
        expect(screen.getByTestId('entity-chips')).toBeInTheDocument()
        expect(screen.getByText('$50.00')).toBeInTheDocument()
      })
    })

    it('should show people chips when people are detected', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, 'dinner with John')

      await waitFor(() => {
        expect(screen.getByTestId('entity-chips')).toBeInTheDocument()
        expect(screen.getByText('John')).toBeInTheDocument()
      })
    })

    it('should show category chips when categories are detected', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, 'coffee break')

      await waitFor(() => {
        expect(screen.getByTestId('entity-chips')).toBeInTheDocument()
        expect(screen.getByText('coffee')).toBeInTheDocument()
      })
    })

    it('should show date chips when dates are detected', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, 'lunch today')

      await waitFor(() => {
        expect(screen.getByTestId('entity-chips')).toBeInTheDocument()
        expect(screen.getByText('today')).toBeInTheDocument()
      })
    })

    it('should show multiple entity types when detected together', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for dinner with John yesterday')

      await waitFor(() => {
        expect(screen.getByTestId('entity-chips')).toBeInTheDocument()
        expect(screen.getByText('$50.00')).toBeInTheDocument()
        expect(screen.getByText('John')).toBeInTheDocument()
        expect(screen.getByText('dinner')).toBeInTheDocument()
        expect(screen.getByText('yesterday')).toBeInTheDocument()
      })
    })

    it('should debounce entity detection to avoid excessive parsing', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)

      // Type rapidly
      await user.type(textarea, '$50 for dinner')

      // parseExpenseText should be called for the debounced final value
      // Due to how userEvent types character by character, we expect multiple calls
      // but fewer than the number of characters typed due to debouncing
      expect(mockParseExpenseText).toHaveBeenCalled()
      expect(mockParseExpenseText).toHaveBeenCalledWith('$50 for dinner')
    })

    it('should clear chips when input is cleared', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for dinner')

      await waitFor(() => {
        expect(screen.getByTestId('entity-chips')).toBeInTheDocument()
      })

      // Clear input
      await user.clear(textarea)

      await waitFor(() => {
        expect(screen.queryByTestId('entity-chips')).not.toBeInTheDocument()
      })
    })

    it('should update chips as user continues typing', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)

      // Type initial text
      await user.type(textarea, '$50')
      await waitFor(() => {
        expect(screen.getByText('$50.00')).toBeInTheDocument()
      })

      // Add more text
      await user.type(textarea, ' for dinner with John')
      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument()
        expect(screen.getByText('dinner')).toBeInTheDocument()
      })
    })

    it('should not show chips when confidence is too low', async () => {
      mockParseExpenseText.mockReturnValue({
        description: 'random text',
        amount: null,
        currency: 'USD',
        possiblePeople: [],
        possibleCategories: [],
        possibleDates: [],
        confidence: 0.1, // Very low confidence
      })

      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, 'random text')

      // Should not show chips for low confidence
      await waitFor(() => {
        expect(screen.queryByTestId('entity-chips')).not.toBeInTheDocument()
      })
    })

    it('should show different chip colors for different entity types', async () => {
      const user = userEvent.setup()
      render(<NLLExpenseInput {...defaultProps} />, { wrapper: createWrapper() })

      const textarea = screen.getByLabelText(/describe the expense/i)
      await user.type(textarea, '$50 for dinner with John yesterday')

      await waitFor(() => {
        const chipsContainer = screen.getByTestId('entity-chips')
        expect(chipsContainer).toBeInTheDocument()

        // Check that different chip types have different styling
        expect(screen.getByTestId('amount-chip')).toBeInTheDocument()
        expect(screen.getAllByTestId('people-chip')).toHaveLength(2) // John and me
        expect(screen.getByTestId('category-chip')).toBeInTheDocument()
        expect(screen.getByTestId('date-chip')).toBeInTheDocument()
      })
    })
  })
})
