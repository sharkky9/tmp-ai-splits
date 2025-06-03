'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  calculateGroupBalances,
  formatBalance,
  sortBalancesByAmount,
  GroupMemberBalance,
  GroupMember,
  Expense,
  ExpenseSplit,
} from '@/lib/balanceUtils'
import { simplifyDebts, formatCurrency } from '@/lib/expenseUtils'
import type { MemberBalance } from '@/types/database'

interface GroupBalancesProps {
  groupId: string
}

export default function GroupBalances({ groupId }: GroupBalancesProps) {
  const [balances, setBalances] = useState<GroupMemberBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch group members with profile information
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select(
          `
          id,
          user_id,
          placeholder_name,
          is_placeholder,
          profiles (
            name
          )
        `
        )
        .eq('group_id', groupId)

      if (membersError) throw membersError

      // Fetch confirmed expenses for the group
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(
          `
          id,
          total_amount,
          payer_id,
          status
        `
        )
        .eq('group_id', groupId)
        .eq('status', 'confirmed')

      if (expensesError) throw expensesError

      // Fetch expense splits for confirmed expenses
      let expenseSplits: ExpenseSplit[] = []
      if (expenses && expenses.length > 0) {
        const expenseIds = expenses.map((e) => e.id)
        const { data: splits, error: splitsError } = await supabase
          .from('expense_splits')
          .select(
            `
            expense_id,
            member_id,
            amount
          `
          )
          .in('expense_id', expenseIds)

        if (splitsError) throw splitsError
        expenseSplits = splits || []
      }

      // Calculate balances using the utility function
      const calculatedBalances = calculateGroupBalances(
        (groupMembers || []).map((member) => ({
          ...member,
          profiles: Array.isArray(member.profiles) ? member.profiles[0] || null : member.profiles,
        })) as GroupMember[],
        (expenses as Expense[]) || [],
        expenseSplits
      )

      // Sort balances for better display
      const sortedBalances = sortBalancesByAmount(calculatedBalances)
      setBalances(sortedBalances)
    } catch (err) {
      console.error('Error fetching balances:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching balances')
    } finally {
      setLoading(false)
    }
  }, [groupId, supabase])

  useEffect(() => {
    if (groupId) {
      fetchBalances()
    }
  }, [groupId, fetchBalances])

  const getBalanceIcon = (balance: number) => {
    if (Math.abs(balance) < 0.01) {
      return <Minus className='w-5 h-5 text-gray-500' />
    } else if (balance > 0) {
      return <TrendingUp className='w-5 h-5 text-green-500' />
    } else {
      return <TrendingDown className='w-5 h-5 text-red-500' />
    }
  }

  const getBalanceColor = (balance: number) => {
    if (Math.abs(balance) < 0.01) {
      return 'text-gray-600'
    } else if (balance > 0) {
      return 'text-green-600'
    } else {
      return 'text-red-600'
    }
  }

  const getBalanceBackground = (balance: number) => {
    if (Math.abs(balance) < 0.01) {
      return 'bg-gray-50 border-gray-200'
    } else if (balance > 0) {
      return 'bg-green-50 border-green-200'
    } else {
      return 'bg-red-50 border-red-200'
    }
  }

  if (loading) {
    return (
      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
            <DollarSign className='w-5 h-5' />
            Group Balances
          </h3>
        </div>
        <div className='space-y-3'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='animate-pulse'>
              <div className='flex items-center justify-between p-4 border border-gray-200 rounded-lg'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-gray-200 rounded-full'></div>
                  <div className='h-4 bg-gray-200 rounded w-24'></div>
                </div>
                <div className='h-4 bg-gray-200 rounded w-20'></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
            <DollarSign className='w-5 h-5' />
            Group Balances
          </h3>
          <button
            onClick={fetchBalances}
            className='flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-md transition-colors'
          >
            <RefreshCw className='w-4 h-4' />
            Retry
          </button>
        </div>
        <div className='text-center py-8'>
          <div className='text-red-600 mb-2'>Error loading balances</div>
          <div className='text-sm text-gray-500'>{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
          <DollarSign className='w-5 h-5' />
          Group Balances
        </h3>
        <button
          onClick={fetchBalances}
          className='flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-md transition-colors'
        >
          <RefreshCw className='w-4 h-4' />
          Refresh
        </button>
      </div>

      {balances.length === 0 ? (
        <div className='text-center py-8'>
          <DollarSign className='w-12 h-12 text-gray-300 mx-auto mb-3' />
          <div className='text-gray-500 font-medium mb-1'>No balances to show</div>
          <div className='text-sm text-gray-400'>Add some expenses to see who owes what</div>
        </div>
      ) : (
        <div className='space-y-3'>
          {balances.map((balance) => (
            <div
              key={balance.member_id}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${getBalanceBackground(balance.net_balance)}`}
            >
              <div className='flex items-center gap-3'>
                <div className='flex items-center justify-center w-10 h-10 bg-white border-2 border-gray-200 rounded-full'>
                  <User className='w-5 h-5 text-gray-500' />
                </div>
                <div>
                  <div className='font-medium text-gray-900'>
                    {balance.name}
                    {balance.is_placeholder && (
                      <span className='ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full'>
                        Guest
                      </span>
                    )}
                  </div>
                  <div className='text-sm text-gray-500'>
                    Paid: ${balance.total_paid.toFixed(2)} • Share: $
                    {balance.total_share.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                {getBalanceIcon(balance.net_balance)}
                <div className={`font-semibold ${getBalanceColor(balance.net_balance)}`}>
                  {formatBalance(balance.net_balance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {balances.length > 0 && (
        <div className='mt-6 pt-4 border-t border-gray-200'>
          <div className='text-sm text-gray-500'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-1'>
                <TrendingUp className='w-4 h-4 text-green-500' />
                <span>Gets money back</span>
              </div>
              <div className='flex items-center gap-1'>
                <TrendingDown className='w-4 h-4 text-red-500' />
                <span>Owes money</span>
              </div>
              <div className='flex items-center gap-1'>
                <Minus className='w-4 h-4 text-gray-500' />
                <span>Settled up</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Suggestions */}
      {balances.length > 0 &&
        (() => {
          // Convert GroupMemberBalance to MemberBalance format for simplifyDebts
          const memberBalances: MemberBalance[] = balances.map((balance) => ({
            member_id: balance.member_id,
            user_id: balance.user_id,
            name: balance.name,
            total_paid: balance.total_paid,
            total_owed: balance.total_share,
            net_balance: balance.net_balance,
          }))

          const settlements = simplifyDebts(memberBalances)

          // Only show settlement suggestions if there are actual debts to settle
          if (settlements.length === 0) {
            return null
          }

          return (
            <div className='mt-6 pt-4 border-t border-gray-200'>
              <h4 className='font-medium text-sm text-gray-700 mb-3 flex items-center gap-2'>
                <ArrowRight className='w-4 h-4' />
                Settlement Suggestions
              </h4>
              <div className='space-y-2'>
                {settlements.map((settlement, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='text-sm font-medium text-gray-900'>
                        {settlement.from_name}
                      </div>
                      <ArrowRight className='w-4 h-4 text-blue-500' />
                      <div className='text-sm font-medium text-gray-900'>{settlement.to_name}</div>
                    </div>
                    <div className='text-blue-700 font-semibold'>
                      {formatCurrency(settlement.amount)}
                    </div>
                  </div>
                ))}
              </div>
              <div className='mt-3 text-xs text-gray-500'>
                These {settlements.length} transactions will settle all debts in the group.
              </div>
            </div>
          )
        })()}
    </div>
  )
}
