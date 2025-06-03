'use client'

import React, { useState, useMemo } from 'react'
import { Search, Filter, SortAsc, SortDesc, Plus, Calendar, DollarSign, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils/currency'
import type { Expense, GroupMemberWithProfile } from '@/types/database'
import { ExpenseListItem } from './ExpenseListItem'
import { useExpenses } from '../../hooks/useExpenses'

interface ExpenseListProps {
  groupId: string
  groupMembers?: GroupMemberWithProfile[]
  onEditExpense?: (expense: Expense) => void
  onDeleteExpense?: (expense: Expense) => void
}

/**
 * Component to display a list of expenses for a group
 */
export function ExpenseList({
  groupId,
  groupMembers = [],
  onEditExpense,
  onDeleteExpense,
}: ExpenseListProps) {
  const { data: expenses, isLoading, error } = useExpenses(groupId)

  if (isLoading) {
    return (
      <div className='p-4'>
        <p>Loading expenses...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div role='alert' className='p-4 text-red-500'>
        <p>Error loading expenses: {error.message}</p>
      </div>
    )
  }

  if (!expenses || expenses.length === 0) {
    return (
      <div className='p-4 text-gray-500'>
        <p>No expenses found for this group.</p>
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      <h3 className='text-lg font-semibold'>Expenses</h3>
      {expenses.map((expense) => (
        <ExpenseListItem
          key={expense.id}
          expense={expense}
          groupMembers={groupMembers}
          onEdit={onEditExpense}
          onDelete={onDeleteExpense}
        />
      ))}
    </div>
  )
}
