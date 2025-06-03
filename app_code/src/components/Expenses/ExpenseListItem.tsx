'use client'

import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Users,
  CreditCard,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateForDisplay, formatDistanceToNowSafe } from '@/lib/utils/dateUtils'
import { generateSplitRationale } from '@/lib/expenseUtils'
import type { Expense, GroupMemberWithProfile } from '@/types/database'

interface ExpenseListItemProps {
  expense: Expense
  groupMembers: GroupMemberWithProfile[]
  onEdit?: (expense: Expense) => void
  onDelete?: (expense: Expense) => void
  isLoading?: boolean
  showActions?: boolean
}

export function ExpenseListItem({
  expense,
  groupMembers,
  onEdit,
  onDelete,
  isLoading = false,
  showActions = true,
}: ExpenseListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getMemberName = (userId?: string, placeholderName?: string) => {
    if (placeholderName) return placeholderName
    if (userId) {
      const member = groupMembers.find((m) => m.user_id === userId)
      return member?.profiles?.name || member?.profiles?.email || 'Unknown User'
    }
    return 'Unknown'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending_confirmation':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'edited':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed'
      case 'pending_confirmation':
        return 'Pending Review'
      case 'edited':
        return 'Edited'
      default:
        return status
    }
  }

  const handleEdit = () => {
    onEdit?.(expense)
  }

  const handleDelete = () => {
    if (
      window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')
    ) {
      onDelete?.(expense)
    }
  }

  return (
    <Card className='w-full'>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className='cursor-pointer hover:bg-gray-50 transition-colors'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                {isExpanded ? (
                  <ChevronDown className='w-4 h-4 text-gray-500' />
                ) : (
                  <ChevronRight className='w-4 h-4 text-gray-500' />
                )}
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <h3 className='font-medium text-lg'>{expense.description}</h3>
                    <Badge variant='outline' className={getStatusColor(expense.status)}>
                      {getStatusText(expense.status)}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-4 text-sm text-gray-600'>
                    <span className='flex items-center gap-1'>
                      <DollarSign className='w-3 h-3' />
                      {formatCurrency(expense.total_amount, expense.currency)}
                    </span>
                    <span className='flex items-center gap-1'>
                      <Calendar className='w-3 h-3' />
                      {formatDateForDisplay(expense.date_of_expense)}
                    </span>
                    <span className='flex items-center gap-1'>
                      <Users className='w-3 h-3' />
                      {expense.participants.length} people
                    </span>
                  </div>
                </div>
              </div>

              {showActions && (
                <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleEdit}
                    disabled={isLoading}
                    aria-label='Edit expense'
                  >
                    <Edit className='w-4 h-4' />
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleDelete}
                    disabled={isLoading}
                    className='text-red-600 hover:text-red-700 hover:bg-red-50'
                    aria-label='Delete expense'
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className='pt-0'>
            <div className='space-y-4'>
              <Separator />

              {/* Expense Details */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Payers */}
                <div className='space-y-2'>
                  <h4 className='font-medium text-sm text-gray-700 flex items-center gap-2'>
                    <CreditCard className='w-4 h-4' />
                    Who Paid ({expense.payers.length})
                  </h4>
                  <div className='space-y-1'>
                    {expense.payers.map((payer, index) => (
                      <div
                        key={index}
                        className='flex justify-between items-center p-2 bg-green-50 rounded text-sm'
                      >
                        <span className='font-medium'>
                          {getMemberName(payer.user_id, payer.placeholder_name)}
                        </span>
                        <span className='text-green-700 font-semibold'>
                          {formatCurrency(payer.amount, expense.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Participants */}
                <div className='space-y-2'>
                  <h4 className='font-medium text-sm text-gray-700 flex items-center gap-2'>
                    <Users className='w-4 h-4' />
                    Who Owes ({expense.participants.length})
                  </h4>
                  <div className='space-y-1'>
                    {expense.participants.map((participant, index) => (
                      <div
                        key={index}
                        className='flex justify-between items-center p-2 bg-orange-50 rounded text-sm'
                      >
                        <span className='font-medium'>
                          {getMemberName(participant.user_id, participant.placeholder_name)}
                        </span>
                        <span className='text-orange-700 font-semibold'>
                          {formatCurrency(participant.amount, expense.currency)}
                          {participant.percentage && (
                            <span className='text-gray-500 ml-1'>({participant.percentage}%)</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Split Rationale */}
              <div className='space-y-2'>
                <h4 className='font-medium text-sm text-gray-700 flex items-center gap-2'>
                  <Info className='w-4 h-4' />
                  Split Explanation
                </h4>
                <div className='space-y-1'>
                  {generateSplitRationale(
                    expense.participants,
                    expense.total_amount,
                    expense.currency
                  ).map((explanation, index) => (
                    <div
                      key={index}
                      className='flex justify-between items-center p-2 bg-blue-50 rounded text-sm'
                    >
                      <span className='font-medium'>
                        {getMemberName(
                          explanation.participantKey.startsWith('user')
                            ? explanation.participantKey
                            : undefined,
                          explanation.participantKey.startsWith('user')
                            ? undefined
                            : explanation.participantKey
                        )}
                      </span>
                      <div className='text-right'>
                        <div className='text-blue-700 font-semibold'>
                          {formatCurrency(explanation.amount, expense.currency)}
                        </div>
                        <div className='text-xs text-gray-600'>{explanation.rationale}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items (if itemized) */}
              {expense.items && expense.items.length > 0 && (
                <div className='space-y-2'>
                  <h4 className='font-medium text-sm text-gray-700'>
                    Itemized Breakdown ({expense.items.length} items)
                  </h4>
                  <div className='space-y-2'>
                    {expense.items.map((item, index) => (
                      <div key={item.id || index} className='p-3 bg-gray-50 rounded border'>
                        <div className='flex justify-between items-start mb-2'>
                          <span className='font-medium'>{item.description}</span>
                          <span className='font-semibold'>
                            {formatCurrency(item.amount, expense.currency)}
                          </span>
                        </div>
                        {item.participants && item.participants.length > 0 && (
                          <div className='text-sm text-gray-600'>
                            <span>Split between: </span>
                            {item.participants.map((p, i) => (
                              <span key={i}>
                                {getMemberName(p.user_id, p.placeholder_name)}
                                {i < item.participants.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className='flex justify-between items-center text-xs text-gray-500 pt-2 border-t'>
                <span>Created {formatDistanceToNowSafe(expense.created_at)}</span>
                {expense.llm_confidence_score && (
                  <span>AI Confidence: {Math.round(expense.llm_confidence_score * 100)}%</span>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
