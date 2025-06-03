import { useQuery } from '@tanstack/react-query'
import { MemberBalance, SimplifiedDebt, Expense } from '../types/database'
import { supabase } from '../lib/supabaseClient'
import { calculateMemberBalances, simplifyDebts } from '../lib/expenseUtils'

/**
 * React Query hook for fetching and managing member balances for a group
 */
export function useBalances(groupId: string) {
  return useQuery({
    queryKey: ['balances', groupId],
    queryFn: async (): Promise<MemberBalance[]> => {
      // Fetch expenses with splits
      const { data: expenses, error: expensesError } = await supabase
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
        .eq('status', 'confirmed') // Only include confirmed expenses

      if (expensesError) {
        throw new Error(`Failed to fetch expenses: ${expensesError.message}`)
      }

      // Fetch group members
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(
          `
          id,
          user_id,
          placeholder_name,
          is_placeholder,
          profiles!inner (
            display_name
          )
        `
        )
        .eq('group_id', groupId)

      if (membersError) {
        throw new Error(`Failed to fetch group members: ${membersError.message}`)
      }

      // Transform member data to include display names
      const transformedMembers = members.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        name: member.is_placeholder
          ? member.placeholder_name
          : (member.profiles as any)?.display_name || 'Unknown User',
      }))

      // Calculate balances using our utility function
      return calculateMemberBalances(expenses || [], transformedMembers)
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })
}

/**
 * Hook for calculating settlement suggestions
 */
export function useSettlementSuggestions(groupId: string) {
  return useQuery({
    queryKey: ['settlement', groupId],
    queryFn: async (): Promise<SimplifiedDebt[]> => {
      // Fetch balances using Supabase function (for optimized calculation)
      const { data, error } = await supabase.functions.invoke('calculate-settlement', {
        body: { group_id: groupId },
      })

      if (error) {
        // Fallback to client-side calculation if function fails
        console.warn('Settlement function failed, falling back to client calculation:', error)

        // Use the same logic as useBalances but calculate debts
        const { data: expenses, error: expensesError } = await supabase
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
          .eq('status', 'confirmed')

        if (expensesError) {
          throw new Error(`Failed to fetch expenses: ${expensesError.message}`)
        }

        const { data: members, error: membersError } = await supabase
          .from('group_members')
          .select(
            `
            id,
            user_id,
            placeholder_name,
            is_placeholder,
            profiles!inner (
              display_name
            )
          `
          )
          .eq('group_id', groupId)

        if (membersError) {
          throw new Error(`Failed to fetch group members: ${membersError.message}`)
        }

        const transformedMembers = members.map((member) => ({
          id: member.id,
          user_id: member.user_id,
          name: member.is_placeholder
            ? member.placeholder_name
            : (member.profiles as any)?.display_name || 'Unknown User',
        }))

        const balances = calculateMemberBalances(expenses || [], transformedMembers)
        return simplifyDebts(balances)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to calculate settlement')
      }

      return data.debts
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })
}

/**
 * Hook for fetching member balance summary
 */
export function useMemberBalanceSummary(groupId: string, memberId: string) {
  return useQuery({
    queryKey: ['member-balance', groupId, memberId],
    queryFn: async (): Promise<MemberBalance | null> => {
      // Get all balances and find the specific member
      const { data: expenses, error: expensesError } = await supabase
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
        .eq('status', 'confirmed')

      if (expensesError) {
        throw new Error(`Failed to fetch expenses: ${expensesError.message}`)
      }

      // Fetch the specific member
      const { data: member, error: memberError } = await supabase
        .from('group_members')
        .select(
          `
          id,
          user_id,
          placeholder_name,
          is_placeholder,
          profiles!inner (
            display_name
          )
        `
        )
        .eq('id', memberId)
        .single()

      if (memberError) {
        if (memberError.code === 'PGRST116') {
          return null // Member not found
        }
        throw new Error(`Failed to fetch member: ${memberError.message}`)
      }

      const transformedMember = {
        id: member.id,
        user_id: member.user_id,
        name: member.is_placeholder
          ? member.placeholder_name
          : (member.profiles as any)?.display_name || 'Unknown User',
      }

      // Calculate balance for this specific member
      const allBalances = calculateMemberBalances(expenses || [], [transformedMember])
      return allBalances[0] || null
    },
    enabled: !!groupId && !!memberId,
    staleTime: 5 * 60 * 1000,
  })
}
