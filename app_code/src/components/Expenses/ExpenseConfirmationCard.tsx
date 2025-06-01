'use client'

import React from 'react'
import { Clock, AlertTriangle, CheckCircle, Edit, X, Users, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDistanceToNow } from 'date-fns'
import type { Expense, GroupMemberWithProfile } from '@/types/database'

interface ExpenseConfirmationCardProps {
  expense: Expense
  groupMembers: GroupMemberWithProfile[]
  onConfirm: (expense: Expense) => void
  onEdit: (expense: Expense) => void
  onDiscard: (expense: Expense) => void
  isLoading?: boolean
}

export function ExpenseConfirmationCard({
  expense,
  groupMembers,
  onConfirm,
  onEdit,
  onDiscard,
  isLoading = false,
}: ExpenseConfirmationCardProps) {
  const getMemberName = (userId?: string, placeholderName?: string) => {
    if (placeholderName) return placeholderName
    if (userId) {
      const member = groupMembers.find((m) => m.user_id === userId)
      return member?.profiles?.name || member?.profiles?.email || 'Unknown User'
    }
    return 'Unknown'
  }

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'bg-gray-500'
    if (score >= 0.8) return 'bg-green-500'
    if (score >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getConfidenceText = (score?: number) => {
    if (!score) return 'Unknown confidence'
    if (score >= 0.8) return 'High confidence'
    if (score >= 0.6) return 'Medium confidence'
    return 'Low confidence'
  }

  return (
    <Card className='w-full max-w-4xl mx-auto'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-xl font-semibold'>Review Expense Interpretation</CardTitle>
          {expense.llm_confidence_score && (
            <Badge
              variant='outline'
              className={`${getConfidenceColor(expense.llm_confidence_score)} text-white border-0`}
            >
              {getConfidenceText(expense.llm_confidence_score)}(
              {Math.round(expense.llm_confidence_score * 100)}%)
            </Badge>
          )}
        </div>
        {expense.status === 'pending_confirmation' && (
          <p className='text-sm text-gray-600'>
            Please review the AI&apos;s interpretation and confirm or make edits.
          </p>
        )}
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Original Input vs Interpretation */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <h3 className='font-medium text-sm text-gray-700 flex items-center'>
              <Clock className='w-4 h-4 mr-2' />
              Your Original Input
            </h3>
            <div className='p-3 bg-gray-50 rounded-lg border'>
              <p className='text-sm whitespace-pre-wrap'>
                {expense.original_input_text || 'No original text available'}
              </p>
            </div>
          </div>

          <div className='space-y-2'>
            <h3 className='font-medium text-sm text-gray-700 flex items-center'>
              <CheckCircle className='w-4 h-4 mr-2' />
              AI Interpretation
            </h3>
            <div className='p-3 bg-blue-50 rounded-lg border border-blue-200'>
              <div className='space-y-2'>
                <div>
                  <span className='font-medium'>Description:</span> {expense.description}
                </div>
                <div>
                  <span className='font-medium'>Amount:</span>{' '}
                  {formatCurrency(expense.total_amount, expense.currency)}
                </div>
                <div>
                  <span className='font-medium'>Date:</span>{' '}
                  {new Date(expense.date_of_expense).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Expense Details */}
        <div className='space-y-4'>
          <h3 className='font-medium text-lg'>Expense Breakdown</h3>

          {/* Payers Section */}
          <div className='space-y-2'>
            <h4 className='font-medium text-sm text-gray-700 flex items-center'>
              <CreditCard className='w-4 h-4 mr-2' />
              Who Paid ({expense.payers.length})
            </h4>
            <div className='space-y-2'>
              {expense.payers.map((payer, index) => (
                <div
                  key={index}
                  className='flex justify-between items-center p-2 bg-green-50 rounded border'
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

          {/* Participants Section */}
          <div className='space-y-2'>
            <h4 className='font-medium text-sm text-gray-700 flex items-center'>
              <Users className='w-4 h-4 mr-2' />
              Who Owes ({expense.participants.length})
            </h4>
            <div className='space-y-2'>
              {expense.participants.map((participant, index) => (
                <div
                  key={index}
                  className='flex justify-between items-center p-2 bg-orange-50 rounded border'
                >
                  <span className='font-medium'>
                    {getMemberName(participant.user_id, participant.placeholder_name)}
                  </span>
                  <span className='text-orange-700 font-semibold'>
                    {formatCurrency(participant.amount, expense.currency)}
                    {participant.percentage && (
                      <span className='text-sm text-gray-500 ml-1'>
                        ({participant.percentage}%)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LLM Assumptions */}
        {expense.llm_assumptions && expense.llm_assumptions.length > 0 && (
          <>
            <Separator />
            <div className='space-y-2'>
              <h4 className='font-medium text-sm text-gray-700 flex items-center'>
                <AlertTriangle className='w-4 h-4 mr-2' />
                AI Assumptions Made
              </h4>
              <div className='space-y-1'>
                {expense.llm_assumptions.map((assumption, index) => (
                  <div key={index} className='p-2 bg-yellow-50 rounded border border-yellow-200'>
                    <p className='text-sm text-yellow-800'>{assumption}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Items (if itemized) */}
        {expense.items && expense.items.length > 0 && (
          <>
            <Separator />
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
          </>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className='flex flex-col sm:flex-row gap-3'>
          <Button
            onClick={() => onConfirm(expense)}
            disabled={isLoading}
            className='flex-1 bg-green-600 hover:bg-green-700 text-white'
          >
            <CheckCircle className='w-4 h-4 mr-2' />
            Confirm Expense
          </Button>

          <Button
            onClick={() => onEdit(expense)}
            disabled={isLoading}
            variant='outline'
            className='flex-1'
          >
            <Edit className='w-4 h-4 mr-2' />
            Edit Details
          </Button>

          <Button
            onClick={() => onDiscard(expense)}
            disabled={isLoading}
            variant='outline'
            className='flex-1 text-red-600 border-red-200 hover:bg-red-50'
          >
            <X className='w-4 h-4 mr-2' />
            Discard
          </Button>
        </div>

        {/* Additional Info */}
        <div className='text-xs text-gray-500 pt-2 border-t'>
          Created {formatDistanceToNow(new Date(expense.created_at))} ago
        </div>
      </CardContent>
    </Card>
  )
}
