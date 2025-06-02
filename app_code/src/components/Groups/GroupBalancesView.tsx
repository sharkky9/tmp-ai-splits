'use client'

import React from 'react'
import { useBalances } from '../../hooks/useBalances'

interface GroupBalancesViewProps {
  groupId: string
}

/**
 * Component to display member balances and settlement suggestions
 */
export function GroupBalancesView({ groupId }: GroupBalancesViewProps) {
  const { data: balances, isLoading, error } = useBalances(groupId)

  if (isLoading) {
    return (
      <div className='p-4'>
        <p>Loading balances...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-4 text-red-500'>
        <p>Error loading balances: {error.message}</p>
      </div>
    )
  }

  return (
    <div className='p-4'>
      <h3 className='text-lg font-semibold mb-4'>Member Balances</h3>
      <p className='text-gray-500'>TODO: Implement balance display and settlement suggestions</p>

      {balances && balances.length > 0 && (
        <div className='mt-4'>
          <p className='text-sm text-gray-600'>{balances.length} members with balances</p>
        </div>
      )}
    </div>
  )
}
