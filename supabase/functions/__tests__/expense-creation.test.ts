import { describe, it, expect, beforeEach, afterEach } from 'https://deno.land/std@0.177.0/testing/bdd.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Mock data types for testing
interface CreateExpenseRequest {
  group_id: string
  description: string
  total_amount: number
  currency: string
  date_of_expense: string
  category?: string
  tags?: string[]
  payer_id: string
  split_method: 'equal' | 'amount' | 'percentage'
  participants: ExpenseParticipantInput[]
}

interface ExpenseParticipantInput {
  member_id: string
  user_id?: string
  placeholder_name?: string
  split_amount?: number
  split_percentage?: number
}

interface ExpenseSplit {
  id: string
  expense_id: string
  member_id: string
  user_id?: string
  placeholder_name?: string
  split_amount: number
  share_description?: string
}

describe('Expense Creation Backend Logic', () => {
  let supabase: any
  let testGroupId: string
  let testMembers: any[]

  beforeEach(async () => {
    // Initialize Supabase client for testing
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Create test group and members
    const { data: group } = await supabase
      .from('groups')
      .insert({
        name: 'Test Group for Expense Creation',
        description: 'Test group for expense creation tests',
        created_by: 'test-user-id'
      })
      .select()
      .single()

    testGroupId = group.id

    // Create test members
    const { data: members } = await supabase
      .from('group_members')
      .insert([
        {
          group_id: testGroupId,
          user_id: 'test-user-1',
          placeholder_name: null,
          is_placeholder: false,
          role: 'admin'
        },
        {
          group_id: testGroupId,
          user_id: 'test-user-2',
          placeholder_name: null,
          is_placeholder: false,
          role: 'member'
        },
        {
          group_id: testGroupId,
          user_id: null,
          placeholder_name: 'John Doe',
          is_placeholder: true,
          role: 'member'
        }
      ])
      .select()

    testMembers = members
  })

  afterEach(async () => {
    // Clean up test data
    await supabase.from('expense_splits').delete().eq('expense_id', 'test-expense-id')
    await supabase.from('expenses').delete().eq('group_id', testGroupId)
    await supabase.from('group_members').delete().eq('group_id', testGroupId)
    await supabase.from('groups').delete().eq('id', testGroupId)
  })

  describe('Equal Split Calculation', () => {
    it('should create expense with equal splits correctly', async () => {
      const request: CreateExpenseRequest = {
        group_id: testGroupId,
        description: 'Test dinner expense',
        total_amount: 30.00,
        currency: 'USD',
        date_of_expense: '2024-01-15',
        category: 'food',
        tags: ['dinner', 'restaurant'],
        payer_id: testMembers[0].id,
        split_method: 'equal',
        participants: [
          { member_id: testMembers[0].id, user_id: 'test-user-1' },
          { member_id: testMembers[1].id, user_id: 'test-user-2' },
          { member_id: testMembers[2].id, placeholder_name: 'John Doe' }
        ]
      }

      // Test expense creation
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          group_id: request.group_id,
          description: request.description,
          total_amount: request.total_amount,
          currency: request.currency,
          date_of_expense: request.date_of_expense,
          category: request.category,
          tags: request.tags,
          payers: [{ user_id: 'test-user-1', amount: 30.00 }],
          participants: [],
          status: 'confirmed',
          created_by: 'test-user-1'
        })
        .select()
        .single()

      expect(expenseError).toBe(null)
      expect(expense.total_amount).toBe('30.00')
      expect(expense.category).toBe('food')
      expect(expense.tags).toEqual(['dinner', 'restaurant'])

      // Test equal split calculation
      const equalSplitAmount = 30.00 / 3 // $10.00 each
      
      const splits = [
        {
          expense_id: expense.id,
          member_id: testMembers[0].id,
          user_id: 'test-user-1',
          split_amount: equalSplitAmount,
          share_description: 'Equal split of $30.00 among 3 people'
        },
        {
          expense_id: expense.id,
          member_id: testMembers[1].id,
          user_id: 'test-user-2',
          split_amount: equalSplitAmount,
          share_description: 'Equal split of $30.00 among 3 people'
        },
        {
          expense_id: expense.id,
          member_id: testMembers[2].id,
          placeholder_name: 'John Doe',
          split_amount: equalSplitAmount,
          share_description: 'Equal split of $30.00 among 3 people'
        }
      ]

      const { data: createdSplits, error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)
        .select()

      expect(splitsError).toBe(null)
      expect(createdSplits).toHaveLength(3)
      expect(createdSplits[0].split_amount).toBe('10.00')
    })

    it('should handle remainder correctly in equal splits', async () => {
      // Test case: $10.00 split among 3 people = $3.33, $3.33, $3.34
      const totalAmount = 10.00
      const participantCount = 3
      const expectedSplits = [3.33, 3.33, 3.34]

      // Create expense
      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          group_id: testGroupId,
          description: 'Test uneven split',
          total_amount: totalAmount,
          currency: 'USD',
          date_of_expense: '2024-01-15',
          payers: [{ user_id: 'test-user-1', amount: totalAmount }],
          participants: [],
          status: 'confirmed',
          created_by: 'test-user-1'
        })
        .select()
        .single()

      // Test equal split with remainder handling
      const baseAmount = Math.floor((totalAmount * 100) / participantCount) / 100
      const remainder = Math.round((totalAmount * 100) - (baseAmount * 100 * participantCount))
      
      expect(baseAmount).toBe(3.33)
      expect(remainder).toBe(1) // 1 cent to distribute
    })
  })

  describe('Custom Amount Split Calculation', () => {
    it('should create expense with custom amount splits', async () => {
      const request: CreateExpenseRequest = {
        group_id: testGroupId,
        description: 'Test custom split expense',
        total_amount: 50.00,
        currency: 'USD',
        date_of_expense: '2024-01-15',
        payer_id: testMembers[0].id,
        split_method: 'amount',
        participants: [
          { member_id: testMembers[0].id, user_id: 'test-user-1', split_amount: 20.00 },
          { member_id: testMembers[1].id, user_id: 'test-user-2', split_amount: 15.00 },
          { member_id: testMembers[2].id, placeholder_name: 'John Doe', split_amount: 15.00 }
        ]
      }

      // Validate split amounts sum to total
      const totalSplitAmount = request.participants.reduce((sum, p) => sum + (p.split_amount || 0), 0)
      expect(totalSplitAmount).toBe(request.total_amount)

      // Create expense with custom splits
      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          group_id: request.group_id,
          description: request.description,
          total_amount: request.total_amount,
          currency: request.currency,
          date_of_expense: request.date_of_expense,
          payers: [{ user_id: 'test-user-1', amount: 50.00 }],
          participants: [],
          status: 'confirmed',
          created_by: 'test-user-1'
        })
        .select()
        .single()

      const splits = request.participants.map(p => ({
        expense_id: expense.id,
        member_id: p.member_id,
        user_id: p.user_id,
        placeholder_name: p.placeholder_name,
        split_amount: p.split_amount!,
        share_description: `Custom amount: $${p.split_amount}`
      }))

      const { data: createdSplits, error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)
        .select()

      expect(splitsError).toBe(null)
      expect(createdSplits).toHaveLength(3)
      expect(parseFloat(createdSplits[0].split_amount)).toBe(20.00)
      expect(parseFloat(createdSplits[1].split_amount)).toBe(15.00)
      expect(parseFloat(createdSplits[2].split_amount)).toBe(15.00)
    })

    it('should reject splits that do not sum to total amount', async () => {
      const request: CreateExpenseRequest = {
        group_id: testGroupId,
        description: 'Invalid split test',
        total_amount: 50.00,
        currency: 'USD',
        date_of_expense: '2024-01-15',
        payer_id: testMembers[0].id,
        split_method: 'amount',
        participants: [
          { member_id: testMembers[0].id, split_amount: 20.00 },
          { member_id: testMembers[1].id, split_amount: 20.00 } // Total only 40, should be 50
        ]
      }

      const totalSplitAmount = request.participants.reduce((sum, p) => sum + (p.split_amount || 0), 0)
      expect(totalSplitAmount).not.toBe(request.total_amount)
      
      // This should fail validation
      expect(totalSplitAmount).toBe(40.00)
      expect(request.total_amount).toBe(50.00)
    })
  })

  describe('Percentage Split Calculation', () => {
    it('should create expense with percentage splits', async () => {
      const request: CreateExpenseRequest = {
        group_id: testGroupId,
        description: 'Test percentage split',
        total_amount: 100.00,
        currency: 'USD',
        date_of_expense: '2024-01-15',
        payer_id: testMembers[0].id,
        split_method: 'percentage',
        participants: [
          { member_id: testMembers[0].id, split_percentage: 50 }, // $50
          { member_id: testMembers[1].id, split_percentage: 30 }, // $30
          { member_id: testMembers[2].id, split_percentage: 20 }  // $20
        ]
      }

      // Validate percentages sum to 100%
      const totalPercentage = request.participants.reduce((sum, p) => sum + (p.split_percentage || 0), 0)
      expect(totalPercentage).toBe(100)

      // Create expense
      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          group_id: request.group_id,
          description: request.description,
          total_amount: request.total_amount,
          currency: request.currency,
          date_of_expense: request.date_of_expense,
          payers: [{ user_id: 'test-user-1', amount: 100.00 }],
          participants: [],
          status: 'confirmed',
          created_by: 'test-user-1'
        })
        .select()
        .single()

      // Calculate split amounts from percentages
      const splits = request.participants.map(p => ({
        expense_id: expense.id,
        member_id: p.member_id,
        user_id: p.user_id,
        placeholder_name: p.placeholder_name,
        split_amount: (request.total_amount * (p.split_percentage! / 100)),
        share_description: `${p.split_percentage}% of $${request.total_amount}`
      }))

      const { data: createdSplits, error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)
        .select()

      expect(splitsError).toBe(null)
      expect(createdSplits).toHaveLength(3)
      expect(parseFloat(createdSplits[0].split_amount)).toBe(50.00)
      expect(parseFloat(createdSplits[1].split_amount)).toBe(30.00)
      expect(parseFloat(createdSplits[2].split_amount)).toBe(20.00)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle placeholder members correctly', async () => {
      const request: CreateExpenseRequest = {
        group_id: testGroupId,
        description: 'Test with placeholder',
        total_amount: 24.00,
        currency: 'USD',
        date_of_expense: '2024-01-15',
        payer_id: testMembers[0].id,
        split_method: 'equal',
        participants: [
          { member_id: testMembers[2].id, placeholder_name: 'John Doe' }
        ]
      }

      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          group_id: request.group_id,
          description: request.description,
          total_amount: request.total_amount,
          currency: request.currency,
          date_of_expense: request.date_of_expense,
          payers: [{ user_id: 'test-user-1', amount: 24.00 }],
          participants: [],
          status: 'confirmed',
          created_by: 'test-user-1'
        })
        .select()
        .single()

      const { data: split } = await supabase
        .from('expense_splits')
        .insert({
          expense_id: expense.id,
          member_id: testMembers[2].id,
          placeholder_name: 'John Doe',
          split_amount: 24.00,
          share_description: 'Full amount for placeholder member'
        })
        .select()
        .single()

      expect(split.user_id).toBe(null)
      expect(split.placeholder_name).toBe('John Doe')
      expect(parseFloat(split.split_amount)).toBe(24.00)
    })

    it('should prevent duplicate splits for same expense/member', async () => {
      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          group_id: testGroupId,
          description: 'Duplicate test',
          total_amount: 10.00,
          currency: 'USD',
          date_of_expense: '2024-01-15',
          payers: [{ user_id: 'test-user-1', amount: 10.00 }],
          participants: [],
          status: 'confirmed',
          created_by: 'test-user-1'
        })
        .select()
        .single()

      // First split should succeed
      const { error: firstError } = await supabase
        .from('expense_splits')
        .insert({
          expense_id: expense.id,
          member_id: testMembers[0].id,
          user_id: 'test-user-1',
          split_amount: 10.00
        })

      expect(firstError).toBe(null)

      // Duplicate split should fail
      const { error: duplicateError } = await supabase
        .from('expense_splits')
        .insert({
          expense_id: expense.id,
          member_id: testMembers[0].id,
          user_id: 'test-user-1',
          split_amount: 5.00
        })

      expect(duplicateError).toBeTruthy()
      expect(duplicateError.code).toBe('23505') // Unique constraint violation
    })
  })

  describe('Views and Data Retrieval', () => {
    it('should retrieve expenses with splits using view', async () => {
      // Create expense
      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          group_id: testGroupId,
          description: 'View test expense',
          total_amount: 30.00,
          currency: 'USD',
          date_of_expense: '2024-01-15',
          category: 'food',
          tags: ['test'],
          payers: [{ user_id: 'test-user-1', amount: 30.00 }],
          participants: [],
          status: 'confirmed',
          created_by: 'test-user-1'
        })
        .select()
        .single()

      // Create splits
      await supabase
        .from('expense_splits')
        .insert([
          {
            expense_id: expense.id,
            member_id: testMembers[0].id,
            user_id: 'test-user-1',
            split_amount: 15.00,
            share_description: 'Split 1'
          },
          {
            expense_id: expense.id,
            member_id: testMembers[1].id,
            user_id: 'test-user-2',
            split_amount: 15.00,
            share_description: 'Split 2'
          }
        ])

      // Test view query
      const { data: expenseWithSplits, error } = await supabase
        .from('expenses_with_splits')
        .select('*')
        .eq('id', expense.id)
        .single()

      expect(error).toBe(null)
      expect(expenseWithSplits.description).toBe('View test expense')
      expect(expenseWithSplits.expense_splits).toHaveLength(2)
      expect(expenseWithSplits.expense_splits[0].split_amount).toBe('15.00')
      expect(expenseWithSplits.expense_splits[1].split_amount).toBe('15.00')
    })
  })
}) 