import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Expense, CreateExpenseRequest, ExpenseWithSplits } from '../types/database'
import { supabase } from '../lib/supabaseClient'

/**
 * React Query hook for fetching and managing expenses for a group
 */
export function useExpenses(groupId: string) {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          `
          *,
          expense_splits (
            id,
            member_id,
            user_id,
            placeholder_name,
            amount,
            percentage
          )
        `
        )
        .eq('group_id', groupId)
        .order('date_of_expense', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch expenses: ${error.message}`)
      }

      return data || []
    },
    enabled: !!groupId,
  })
}

/**
 * Hook for fetching a single expense with full details
 */
export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: ['expense', expenseId],
    queryFn: async (): Promise<ExpenseWithSplits | null> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          `
          *,
          expense_splits (
            id,
            member_id,
            user_id,
            placeholder_name,
            amount,
            percentage
          )
        `
        )
        .eq('id', expenseId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Expense not found
        }
        throw new Error(`Failed to fetch expense: ${error.message}`)
      }

      return data
    },
    enabled: !!expenseId,
  })
}

/**
 * Mutation hook for creating new expenses
 */
export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expenseRequest: CreateExpenseRequest): Promise<Expense> => {
      // Call the Supabase Edge Function for expense creation with splits
      const { data, error } = await supabase.functions.invoke('create-expense-with-splits', {
        body: expenseRequest,
      })

      if (error) {
        throw new Error(`Failed to create expense: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create expense')
      }

      return data.expense
    },
    onSuccess: (data) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['expenses', data.group_id] })
      queryClient.invalidateQueries({ queryKey: ['balances', data.group_id] })
      queryClient.invalidateQueries({ queryKey: ['settlement', data.group_id] })
    },
  })
}

/**
 * Mutation hook for updating expenses
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      expenseId,
      updates,
    }: {
      expenseId: string
      updates: Partial<CreateExpenseRequest>
    }): Promise<Expense> => {
      // For updates, we'll need to handle expense_splits separately
      const { expense_splits, participants, ...expenseUpdates } = updates as any

      // Update the main expense record
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .update(expenseUpdates)
        .eq('id', expenseId)
        .select()
        .single()

      if (expenseError) {
        throw new Error(`Failed to update expense: ${expenseError.message}`)
      }

      // If participants are updated, we need to recreate splits
      if (participants) {
        // Delete existing splits
        const { error: deleteError } = await supabase
          .from('expense_splits')
          .delete()
          .eq('expense_id', expenseId)

        if (deleteError) {
          throw new Error(`Failed to update expense splits: ${deleteError.message}`)
        }

        // Create new splits
        const splitData = participants.map((participant: any) => ({
          expense_id: expenseId,
          member_id: participant.member_id,
          user_id: participant.user_id,
          placeholder_name: participant.placeholder_name,
          amount: participant.split_amount,
          percentage: participant.split_percentage,
        }))

        const { error: insertError } = await supabase.from('expense_splits').insert(splitData)

        if (insertError) {
          throw new Error(`Failed to create new expense splits: ${insertError.message}`)
        }
      }

      return expenseData
    },
    onSuccess: (data) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['expenses', data.group_id] })
      queryClient.invalidateQueries({ queryKey: ['expense', data.id] })
      queryClient.invalidateQueries({ queryKey: ['balances', data.group_id] })
      queryClient.invalidateQueries({ queryKey: ['settlement', data.group_id] })
    },
  })
}

/**
 * Mutation hook for deleting expenses
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expenseId: string): Promise<void> => {
      // Delete the expense (splits will be deleted automatically due to foreign key cascade)
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId)

      if (error) {
        throw new Error(`Failed to delete expense: ${error.message}`)
      }
    },
    onSuccess: (_, expenseId) => {
      // Remove the expense from cache and invalidate related queries
      queryClient.removeQueries({ queryKey: ['expense', expenseId] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['balances'] })
      queryClient.invalidateQueries({ queryKey: ['settlement'] })
    },
  })
}

/**
 * Mutation hook for confirming pending expenses
 */
export function useConfirmExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expenseId: string): Promise<Expense> => {
      const { data, error } = await supabase
        .from('expenses')
        .update({ status: 'confirmed' })
        .eq('id', expenseId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to confirm expense: ${error.message}`)
      }

      return data
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['expenses', data.group_id] })
      queryClient.invalidateQueries({ queryKey: ['expense', data.id] })
      queryClient.invalidateQueries({ queryKey: ['balances', data.group_id] })
      queryClient.invalidateQueries({ queryKey: ['settlement', data.group_id] })
    },
  })
}
