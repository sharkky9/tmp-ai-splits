'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowRight,
  Check,
  Copy,
  Mail,
  Calculator,
  Users,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

interface MemberBalance {
  memberId: string
  memberName: string
  isPlaceholder: boolean
  balance: number // positive = owes money, negative = is owed money
}

interface SettlementTransaction {
  id: string
  fromMemberId: string
  fromMemberName: string
  toMemberId: string
  toMemberName: string
  amount: number
  currency: string
  isFromPlaceholder: boolean
  isToPlaceholder: boolean
  isSettled?: boolean
}

interface SettlementResult {
  transactions: SettlementTransaction[]
  memberBalances: MemberBalance[]
  totalSettlementAmount: number
  currency: string
  minimumTransactions: number
}

interface SettlementSummaryViewProps {
  groupId: string
  groupName?: string
  onTransactionSettled?: (transactionId: string) => void
  isLoading?: boolean
}

export function SettlementSummaryView({
  groupId,
  groupName = 'Group',
  onTransactionSettled,
  isLoading: externalLoading = false,
}: SettlementSummaryViewProps) {
  const [settlementData, setSettlementData] = useState<SettlementResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settledTransactions, setSettledTransactions] = useState<Set<string>>(new Set())
  const [copiedText, setCopiedText] = useState('')

  // Fetch settlement data
  const fetchSettlementData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/supabase/functions/calculate-settlement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch settlement data: ${response.statusText}`)
      }

      const data: SettlementResult = await response.json()
      setSettlementData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate settlement')
      console.error('Settlement calculation error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    fetchSettlementData()
  }, [fetchSettlementData])

  // Mark transaction as settled
  const handleMarkAsSettled = (transactionId: string) => {
    setSettledTransactions((prev) => new Set([...prev, transactionId]))
    onTransactionSettled?.(transactionId)
  }

  // Copy settlement summary to clipboard
  const handleCopyToClipboard = async () => {
    if (!settlementData) return

    const summary = generateTextSummary(settlementData)
    try {
      await navigator.clipboard.writeText(summary)
      setCopiedText('Settlement summary copied to clipboard!')
      setTimeout(() => setCopiedText(''), 3000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  // Generate text summary for sharing
  const generateTextSummary = (data: SettlementResult): string => {
    const lines = [
      `${groupName} - Settlement Summary`,
      '='.repeat(groupName.length + 20),
      '',
      `Total Settlement Amount: ${formatCurrency(data.totalSettlementAmount, data.currency)}`,
      `Number of Transactions: ${data.minimumTransactions}`,
      '',
      'Transactions:',
      ...data.transactions.map(
        (t, i) =>
          `${i + 1}. ${t.fromMemberName} pays ${t.toMemberName} ${formatCurrency(t.amount, t.currency)}`
      ),
      '',
      'Member Balances:',
      ...data.memberBalances
        .filter((b) => Math.abs(b.balance) > 0.01)
        .map((b) => {
          const status = b.balance > 0 ? 'owes' : 'is owed'
          return `• ${b.memberName}: ${status} ${formatCurrency(Math.abs(b.balance), data.currency)}`
        }),
      '',
      `Generated on ${new Date().toLocaleDateString()}`,
    ]

    return lines.join('\n')
  }

  // Share via email
  const handleEmailShare = () => {
    if (!settlementData) return

    const summary = generateTextSummary(settlementData)
    const subject = encodeURIComponent(`${groupName} - Settlement Summary`)
    const body = encodeURIComponent(summary)

    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const activeTransactions =
    settlementData?.transactions.filter((t) => !settledTransactions.has(t.id)) || []
  const completedTransactions =
    settlementData?.transactions.filter((t) => settledTransactions.has(t.id)) || []
  const isFullySettled =
    activeTransactions.length === 0 && (settlementData?.transactions.length || 0) > 0

  if (isLoading || externalLoading) {
    return (
      <Card>
        <CardContent className='p-8 text-center'>
          <div className='animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4'></div>
          <p className='text-gray-600'>Calculating optimal settlement...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className='p-8'>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchSettlementData} className='mt-4' variant='outline'>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!settlementData || settlementData.transactions.length === 0) {
    return (
      <Card>
        <CardContent className='p-8 text-center'>
          <Calculator className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <h3 className='text-lg font-semibold mb-2'>All Settled Up!</h3>
          <p className='text-gray-600'>
            No outstanding balances in this group. Everyone&apos;s accounts are even.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Settlement Overview */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <Calculator className='w-5 h-5' />
              Settlement Summary
            </CardTitle>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleCopyToClipboard}
                disabled={!settlementData}
              >
                <Copy className='w-4 h-4 mr-2' />
                Copy
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleEmailShare}
                disabled={!settlementData}
              >
                <Mail className='w-4 h-4 mr-2' />
                Email
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
            <div className='text-center p-4 bg-blue-50 rounded-lg'>
              <DollarSign className='w-6 h-6 text-blue-600 mx-auto mb-2' />
              <p className='text-sm text-gray-600'>Total to Settle</p>
              <p className='text-xl font-semibold text-blue-600'>
                {formatCurrency(settlementData.totalSettlementAmount, settlementData.currency)}
              </p>
            </div>
            <div className='text-center p-4 bg-green-50 rounded-lg'>
              <Users className='w-6 h-6 text-green-600 mx-auto mb-2' />
              <p className='text-sm text-gray-600'>Transactions</p>
              <p className='text-xl font-semibold text-green-600'>
                {settlementData.minimumTransactions}
              </p>
            </div>
            <div className='text-center p-4 bg-purple-50 rounded-lg'>
              <Check className='w-6 h-6 text-purple-600 mx-auto mb-2' />
              <p className='text-sm text-gray-600'>Completed</p>
              <p className='text-xl font-semibold text-purple-600'>
                {completedTransactions.length}/{settlementData.transactions.length}
              </p>
            </div>
          </div>

          {copiedText && (
            <Alert className='mb-4'>
              <Check className='h-4 w-4' />
              <AlertDescription>{copiedText}</AlertDescription>
            </Alert>
          )}

          {isFullySettled && (
            <Alert className='mb-4'>
              <Check className='h-4 w-4' />
              <AlertDescription>
                🎉 All transactions completed! The group is fully settled.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Active Transactions */}
      {activeTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Transactions</CardTitle>
            <p className='text-sm text-gray-600'>
              Complete these transactions to settle all group expenses:
            </p>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {activeTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className='flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors'
                >
                  <div className='flex items-center gap-4'>
                    <div className='w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold'>
                      {index + 1}
                    </div>
                    <div className='flex items-center gap-3'>
                      <div className='text-center'>
                        <p className='font-medium'>{transaction.fromMemberName}</p>
                        {transaction.isFromPlaceholder && (
                          <Badge variant='secondary' className='text-xs'>
                            Placeholder
                          </Badge>
                        )}
                      </div>
                      <ArrowRight className='w-4 h-4 text-gray-400' />
                      <div className='text-center'>
                        <p className='font-medium'>{transaction.toMemberName}</p>
                        {transaction.isToPlaceholder && (
                          <Badge variant='secondary' className='text-xs'>
                            Placeholder
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='text-right'>
                      <p className='font-semibold text-green-600'>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <p className='text-xs text-gray-500'>to pay</p>
                    </div>
                    <Button
                      size='sm'
                      onClick={() => handleMarkAsSettled(transaction.id)}
                      className='bg-green-600 hover:bg-green-700'
                    >
                      <Check className='w-4 h-4 mr-1' />
                      Mark Paid
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Transactions */}
      {completedTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-green-600'>Completed Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {completedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className='flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg'
                >
                  <div className='flex items-center gap-4'>
                    <div className='w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center'>
                      <Check className='w-4 h-4' />
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='font-medium text-gray-700'>
                        {transaction.fromMemberName}
                      </span>
                      <ArrowRight className='w-4 h-4 text-gray-400' />
                      <span className='font-medium text-gray-700'>{transaction.toMemberName}</span>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='font-semibold text-green-600'>
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    <p className='text-xs text-green-600'>✓ Paid</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Member Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            {settlementData.memberBalances
              .filter((balance) => Math.abs(balance.balance) > 0.01)
              .sort((a, b) => b.balance - a.balance)
              .map((balance) => (
                <div
                  key={balance.memberId}
                  className='flex items-center justify-between p-3 border rounded-lg'
                >
                  <div className='flex items-center gap-3'>
                    <span className='font-medium'>{balance.memberName}</span>
                    {balance.isPlaceholder && <Badge variant='secondary'>Placeholder</Badge>}
                  </div>
                  <div className='text-right'>
                    <p
                      className={cn(
                        'font-semibold',
                        balance.balance > 0 ? 'text-red-600' : 'text-green-600'
                      )}
                    >
                      {balance.balance > 0 ? 'Owes ' : 'Is owed '}
                      {formatCurrency(Math.abs(balance.balance), settlementData.currency)}
                    </p>
                  </div>
                </div>
              ))}

            {settlementData.memberBalances.every((b) => Math.abs(b.balance) <= 0.01) && (
              <div className='text-center py-4 text-gray-500'>All members have zero balance</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
