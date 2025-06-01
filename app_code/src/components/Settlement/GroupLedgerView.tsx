'use client'

import React, { useState, useMemo } from 'react'
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Users,
  Receipt,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateForDisplay } from '@/lib/utils/dateUtils'
import { cn } from '@/lib/utils'
import type { Expense, GroupMemberWithProfile } from '@/types/database'

interface GroupLedgerViewProps {
  expenses: Expense[]
  groupMembers: GroupMemberWithProfile[]
  groupName?: string
  isLoading?: boolean
}

interface MemberSummary {
  memberId: string
  memberName: string
  isPlaceholder: boolean
  totalPaid: number
  totalOwed: number
  netBalance: number // negative = owes money, positive = is owed money
  expenseCount: number
}

interface LedgerEntry {
  id: string
  date: string
  description: string
  amount: number
  currency: string
  status: string
  payers: Array<{ name: string; amount: number; isPlaceholder: boolean }>
  participants: Array<{ name: string; amount: number; isPlaceholder: boolean }>
  runningTotal: number
}

type SortField = 'date' | 'amount' | 'description'
type FilterStatus = 'all' | 'confirmed' | 'pending_confirmation' | 'edited'

export function GroupLedgerView({
  expenses,
  groupMembers,
  groupName = 'Group',
  isLoading = false,
}: GroupLedgerViewProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [selectedMember, setSelectedMember] = useState<string>('all')

  const getMemberName = (userId?: string, placeholderName?: string) => {
    if (placeholderName) return placeholderName
    if (userId) {
      const member = groupMembers.find((m) => m.user_id === userId)
      return member?.profiles?.name || member?.profiles?.email || 'Unknown User'
    }
    return 'Unknown'
  }

  // Calculate member summaries
  const memberSummaries = useMemo((): MemberSummary[] => {
    const summaries = new Map<string, MemberSummary>()

    // Initialize all group members
    groupMembers.forEach((member) => {
      const memberId = member.user_id || `placeholder-${member.id}`
      const memberName = member.profiles?.name || member.placeholder_name || 'Unknown'
      summaries.set(memberId, {
        memberId,
        memberName,
        isPlaceholder: member.is_placeholder || false,
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
        expenseCount: 0,
      })
    })

    // Process expenses to calculate balances
    expenses.forEach((expense) => {
      // Track payers (amounts paid)
      expense.payers.forEach((payer) => {
        const payerId = payer.user_id || `placeholder-${payer.placeholder_name}`
        const summary = summaries.get(payerId)
        if (summary) {
          summary.totalPaid += payer.amount
          summary.expenseCount += 1
        }
      })

      // Track participants (amounts owed)
      expense.participants.forEach((participant) => {
        const participantId = participant.user_id || `placeholder-${participant.placeholder_name}`
        const summary = summaries.get(participantId)
        if (summary) {
          summary.totalOwed += participant.amount
        }
      })
    })

    // Calculate net balances
    summaries.forEach((summary) => {
      summary.netBalance = summary.totalPaid - summary.totalOwed
    })

    return Array.from(summaries.values()).sort((a, b) => b.netBalance - a.netBalance)
  }, [expenses, groupMembers])

  // Create ledger entries with running totals
  const ledgerEntries = useMemo((): LedgerEntry[] => {
    let filteredExpenses = expenses

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredExpenses = filteredExpenses.filter((expense) => expense.status === statusFilter)
    }

    // Apply member filter
    if (selectedMember !== 'all') {
      filteredExpenses = filteredExpenses.filter(
        (expense) =>
          expense.payers.some(
            (p) =>
              p.user_id === selectedMember ||
              (selectedMember.startsWith('placeholder-') &&
                p.placeholder_name === selectedMember.replace('placeholder-', ''))
          ) ||
          expense.participants.some(
            (p) =>
              p.user_id === selectedMember ||
              (selectedMember.startsWith('placeholder-') &&
                p.placeholder_name === selectedMember.replace('placeholder-', ''))
          )
      )
    }

    // Sort expenses
    filteredExpenses.sort((a, b) => {
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
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    // Create ledger entries with running totals
    let runningTotal = 0
    return filteredExpenses.map((expense) => {
      runningTotal += expense.total_amount

      return {
        id: expense.id,
        date: expense.date_of_expense,
        description: expense.description,
        amount: expense.total_amount,
        currency: expense.currency,
        status: expense.status,
        payers: expense.payers.map((payer) => ({
          name: getMemberName(payer.user_id, payer.placeholder_name),
          amount: payer.amount,
          isPlaceholder: !!payer.placeholder_name,
        })),
        participants: expense.participants.map((participant) => ({
          name: getMemberName(participant.user_id, participant.placeholder_name),
          amount: participant.amount,
          isPlaceholder: !!participant.placeholder_name,
        })),
        runningTotal,
      }
    })
  }, [expenses, statusFilter, selectedMember, sortField, sortDirection, groupMembers])

  // Calculate overview statistics
  const overviewStats = useMemo(() => {
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.total_amount, 0)
    const confirmedSpent = expenses
      .filter((e) => e.status === 'confirmed')
      .reduce((sum, expense) => sum + expense.total_amount, 0)
    const averageExpense = expenses.length > 0 ? totalSpent / expenses.length : 0
    const currency = expenses[0]?.currency || 'USD'

    return {
      totalSpent,
      confirmedSpent,
      averageExpense,
      totalExpenses: expenses.length,
      currency,
    }
  }, [expenses])

  // Export ledger data
  const exportLedgerData = () => {
    const csvData = [
      ['Date', 'Description', 'Amount', 'Status', 'Payers', 'Participants', 'Running Total'],
      ...ledgerEntries.map((entry) => [
        formatDateForDisplay(entry.date),
        entry.description,
        formatCurrency(entry.amount, entry.currency),
        entry.status,
        entry.payers
          .map((p) => `${p.name}: ${formatCurrency(p.amount, entry.currency)}`)
          .join('; '),
        entry.participants
          .map((p) => `${p.name}: ${formatCurrency(p.amount, entry.currency)}`)
          .join('; '),
        formatCurrency(entry.runningTotal, entry.currency),
      ]),
    ]

    const csvContent = csvData.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${groupName}_ledger_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending_confirmation':
        return 'bg-yellow-100 text-yellow-800'
      case 'edited':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className='p-8 text-center'>
          <div className='animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading ledger data...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Overview Statistics */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <DollarSign className='w-4 h-4 text-blue-600' />
              <div>
                <p className='text-sm text-gray-600'>Total Spent</p>
                <p className='text-lg font-semibold'>
                  {formatCurrency(overviewStats.totalSpent, overviewStats.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <Receipt className='w-4 h-4 text-green-600' />
              <div>
                <p className='text-sm text-gray-600'>Confirmed</p>
                <p className='text-lg font-semibold'>
                  {formatCurrency(overviewStats.confirmedSpent, overviewStats.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <Calendar className='w-4 h-4 text-purple-600' />
              <div>
                <p className='text-sm text-gray-600'>Avg. Expense</p>
                <p className='text-lg font-semibold'>
                  {formatCurrency(overviewStats.averageExpense, overviewStats.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <Users className='w-4 h-4 text-orange-600' />
              <div>
                <p className='text-sm text-gray-600'>Total Expenses</p>
                <p className='text-lg font-semibold'>{overviewStats.totalExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Summaries */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='w-5 h-5' />
            Member Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {memberSummaries.map((member) => (
              <div key={member.memberId} className='p-4 border rounded-lg'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{member.memberName}</span>
                    {member.isPlaceholder && (
                      <Badge variant='secondary' className='text-xs'>
                        Placeholder
                      </Badge>
                    )}
                  </div>
                  {member.netBalance !== 0 && (
                    <div className='flex items-center gap-1'>
                      {member.netBalance > 0 ? (
                        <TrendingUp className='w-4 h-4 text-green-600' />
                      ) : (
                        <TrendingDown className='w-4 h-4 text-red-600' />
                      )}
                    </div>
                  )}
                </div>

                <div className='space-y-1 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Paid:</span>
                    <span className='font-medium'>
                      {formatCurrency(member.totalPaid, overviewStats.currency)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Owes:</span>
                    <span className='font-medium'>
                      {formatCurrency(member.totalOwed, overviewStats.currency)}
                    </span>
                  </div>
                  <Separator className='my-1' />
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Net:</span>
                    <span
                      className={cn(
                        'font-semibold',
                        member.netBalance > 0
                          ? 'text-green-600'
                          : member.netBalance < 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                      )}
                    >
                      {member.netBalance > 0 ? '+' : ''}
                      {formatCurrency(member.netBalance, overviewStats.currency)}
                    </span>
                  </div>
                  <div className='flex justify-between text-xs text-gray-500'>
                    <span>Expenses:</span>
                    <span>{member.expenseCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <Receipt className='w-5 h-5' />
              Expense Ledger
            </CardTitle>
            <Button
              variant='outline'
              size='sm'
              onClick={exportLedgerData}
              disabled={ledgerEntries.length === 0}
            >
              <Download className='w-4 h-4 mr-2' />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='flex items-center gap-2'>
              <Filter className='w-4 h-4 text-gray-500' />
              <Select
                value={statusFilter}
                onValueChange={(value: FilterStatus) => setStatusFilter(value)}
              >
                <SelectTrigger className='w-48'>
                  <SelectValue placeholder='Filter by status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Statuses</SelectItem>
                  <SelectItem value='confirmed'>Confirmed</SelectItem>
                  <SelectItem value='pending_confirmation'>Pending</SelectItem>
                  <SelectItem value='edited'>Edited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='Filter by member' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Members</SelectItem>
                {groupMembers.map((member) => (
                  <SelectItem
                    key={member.id}
                    value={member.user_id || `placeholder-${member.placeholder_name}`}
                  >
                    {member.profiles?.name || member.placeholder_name || 'Unknown'}
                    {member.is_placeholder && ' (Placeholder)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setSortField('date')
                  setSortDirection(
                    sortField === 'date' && sortDirection === 'desc' ? 'asc' : 'desc'
                  )
                }}
              >
                Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setSortField('amount')
                  setSortDirection(
                    sortField === 'amount' && sortDirection === 'desc' ? 'asc' : 'desc'
                  )
                }}
              >
                Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>

          {/* Ledger Entries */}
          <div className='space-y-3'>
            {ledgerEntries.length === 0 ? (
              <div className='text-center py-8 text-gray-500'>
                No expenses match your filter criteria.
              </div>
            ) : (
              ledgerEntries.map((entry) => (
                <div
                  key={entry.id}
                  className='p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                >
                  <div className='flex items-start justify-between mb-3'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='font-medium'>{entry.description}</span>
                        <Badge variant='outline' className={getStatusColor(entry.status)}>
                          {entry.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className='text-sm text-gray-600'>{formatDateForDisplay(entry.date)}</p>
                    </div>
                    <div className='text-right'>
                      <p className='font-semibold text-lg'>
                        {formatCurrency(entry.amount, entry.currency)}
                      </p>
                      <p className='text-sm text-gray-500'>
                        Running: {formatCurrency(entry.runningTotal, entry.currency)}
                      </p>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                    <div>
                      <p className='font-medium text-gray-700 mb-1'>Paid by:</p>
                      <div className='space-y-1'>
                        {entry.payers.map((payer, index) => (
                          <div key={index} className='flex justify-between'>
                            <span className='flex items-center gap-1'>
                              {payer.name}
                              {payer.isPlaceholder && (
                                <Badge variant='secondary' className='text-xs'>
                                  P
                                </Badge>
                              )}
                            </span>
                            <span>{formatCurrency(payer.amount, entry.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className='font-medium text-gray-700 mb-1'>Split among:</p>
                      <div className='space-y-1'>
                        {entry.participants.map((participant, index) => (
                          <div key={index} className='flex justify-between'>
                            <span className='flex items-center gap-1'>
                              {participant.name}
                              {participant.isPlaceholder && (
                                <Badge variant='secondary' className='text-xs'>
                                  P
                                </Badge>
                              )}
                            </span>
                            <span>{formatCurrency(participant.amount, entry.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
