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

interface ExpenseListProps {
  expenses: Expense[]
  groupMembers: GroupMemberWithProfile[]
  onExpenseEdit?: (expense: Expense) => void
  onExpenseDelete?: (expense: Expense) => void
  onAddExpense?: () => void
  isLoading?: boolean
  showActions?: boolean
}

type SortField = 'date' | 'amount' | 'description' | 'status'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'confirmed' | 'pending_confirmation' | 'edited'

export function ExpenseList({
  expenses,
  groupMembers,
  onExpenseEdit,
  onExpenseDelete,
  onAddExpense,
  isLoading = false,
  showActions = true,
}: ExpenseListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Calculate expense statistics
  const expenseStats = useMemo(() => {
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.total_amount, 0)
    const totalExpenses = expenses.length
    const confirmedExpenses = expenses.filter((e) => e.status === 'confirmed').length
    const pendingExpenses = expenses.filter((e) => e.status === 'pending_confirmation').length

    return {
      totalAmount,
      totalExpenses,
      confirmedExpenses,
      pendingExpenses,
      currency: expenses[0]?.currency || 'USD',
    }
  }, [expenses])

  // Filter and sort expenses
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = expenses

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.payers.some(
            (payer) =>
              (payer.placeholder_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              groupMembers
                .find((m) => m.user_id === payer.user_id)
                ?.profiles?.name?.toLowerCase()
                .includes(searchTerm.toLowerCase())
          ) ||
          expense.participants.some(
            (participant) =>
              (participant.placeholder_name || '')
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              groupMembers
                .find((m) => m.user_id === participant.user_id)
                ?.profiles?.name?.toLowerCase()
                .includes(searchTerm.toLowerCase())
          )
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((expense) => expense.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date_of_expense).getTime()
          bValue = new Date(b.date_of_expense).getTime()
          break
        case 'amount':
          aValue = a.total_amount
          bValue = b.total_amount
          break
        case 'description':
          aValue = a.description.toLowerCase()
          bValue = b.description.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [expenses, searchTerm, statusFilter, sortField, sortDirection, groupMembers])

  // Paginate expenses
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedExpenses.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedExpenses, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedExpenses.length / itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <SortAsc className='w-4 h-4 ml-1' />
    ) : (
      <SortDesc className='w-4 h-4 ml-1' />
    )
  }

  return (
    <div className='space-y-6'>
      {/* Statistics Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <DollarSign className='w-4 h-4 text-blue-600' />
              <div>
                <p className='text-sm text-gray-600'>Total Spent</p>
                <p className='text-lg font-semibold'>
                  {formatCurrency(expenseStats.totalAmount, expenseStats.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <Calendar className='w-4 h-4 text-green-600' />
              <div>
                <p className='text-sm text-gray-600'>Total Expenses</p>
                <p className='text-lg font-semibold'>{expenseStats.totalExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <Users className='w-4 h-4 text-purple-600' />
              <div>
                <p className='text-sm text-gray-600'>Confirmed</p>
                <p className='text-lg font-semibold'>{expenseStats.confirmedExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <Filter className='w-4 h-4 text-orange-600' />
              <div>
                <p className='text-sm text-gray-600'>Pending</p>
                <p className='text-lg font-semibold'>{expenseStats.pendingExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Expense List</CardTitle>
            {onAddExpense && (
              <Button onClick={onAddExpense} disabled={isLoading}>
                <Plus className='w-4 h-4 mr-2' />
                Add Expense
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4 mb-4'>
            {/* Search */}
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              <Input
                placeholder='Search expenses, people, or descriptions...'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className='pl-9'
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value: StatusFilter) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='Filter by status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Statuses</SelectItem>
                <SelectItem value='confirmed'>Confirmed</SelectItem>
                <SelectItem value='pending_confirmation'>Pending Review</SelectItem>
                <SelectItem value='edited'>Edited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Controls */}
          <div className='flex flex-wrap gap-2 mb-4'>
            <span className='text-sm text-gray-600 flex items-center'>Sort by:</span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleSort('date')}
              className='flex items-center'
            >
              Date
              {getSortIcon('date')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleSort('amount')}
              className='flex items-center'
            >
              Amount
              {getSortIcon('amount')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleSort('description')}
              className='flex items-center'
            >
              Description
              {getSortIcon('description')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleSort('status')}
              className='flex items-center'
            >
              Status
              {getSortIcon('status')}
            </Button>
          </div>

          <Separator />
        </CardContent>
      </Card>

      {/* Expense List */}
      <div className='space-y-4'>
        {isLoading ? (
          <div className='flex justify-center items-center py-8'>
            <div className='text-gray-500'>Loading expenses...</div>
          </div>
        ) : filteredAndSortedExpenses.length === 0 ? (
          <Card>
            <CardContent className='text-center py-8'>
              <p className='text-gray-500 mb-4'>
                {expenses.length === 0
                  ? 'No expenses found. Start by adding your first expense!'
                  : 'No expenses match your search criteria.'}
              </p>
              {onAddExpense && expenses.length === 0 && (
                <Button onClick={onAddExpense}>
                  <Plus className='w-4 h-4 mr-2' />
                  Add First Expense
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {paginatedExpenses.map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                groupMembers={groupMembers}
                onEdit={onExpenseEdit}
                onDelete={onExpenseDelete}
                isLoading={isLoading}
                showActions={showActions}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <Card>
                <CardContent className='p-4'>
                  <div className='flex items-center justify-between'>
                    <div className='text-sm text-gray-600'>
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredAndSortedExpenses.length)} of{' '}
                      {filteredAndSortedExpenses.length} expenses
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className='text-sm'>
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
