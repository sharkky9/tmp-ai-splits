import { useQuery } from '@tanstack/react-query'
import { Expense } from '../types/database'

/**
 * React Query hook for fetching and managing expenses for a group
 */
export function useExpenses(groupId: string) {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async (): Promise<Expense[]> => {
      // TODO: Implement expense fetching from Supabase
      throw new Error('Not implemented')
    },
    enabled: !!groupId,
  })
}

/**
 * Mutation hook for creating new expenses
 */
export function useCreateExpense() {
  // TODO: Implement expense creation mutation
  throw new Error('Not implemented')
}

/**
 * Mutation hook for updating expenses
 */
export function useUpdateExpense() {
  // TODO: Implement expense update mutation
  throw new Error('Not implemented')
}

/**
 * Mutation hook for deleting expenses
 */
export function useDeleteExpense() {
  // TODO: Implement expense deletion mutation
  throw new Error('Not implemented')
}
