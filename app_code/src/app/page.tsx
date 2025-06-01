'use client'

import { useAuthContext } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, Receipt, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { getDashboardData, Group, Expense } from '@/lib/database'

interface DashboardData {
  groups: Group[]
  recentExpenses: Expense[]
}

export default function Home() {
  const { user, isLoading } = useAuthContext()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    groups: [],
    recentExpenses: [],
  })
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (!user) return

    try {
      setIsLoadingData(true)
      setError(null)
      const data = await getDashboardData(user.id)
      setDashboardData(data)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setIsLoadingData(false)
    }
  }, [user])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user, isLoading, router, fetchDashboardData])

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg'>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  const { groups, recentExpenses } = dashboardData
  const totalMembers = groups.reduce((acc, group) => acc + (group.member_count || 0), 0)
  const totalExpenses = groups.reduce((acc, group) => acc + (group.total_expenses || 0), 0)
  const totalBalance = groups.reduce((acc, group) => acc + (group.user_balance || 0), 0)

  return (
    <div className='container mx-auto p-6 space-y-8'>
      {/* Welcome Section */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold'>
            Welcome back, {user.user_metadata?.full_name || user.email}!
          </h1>
          <p className='text-muted-foreground mt-2'>
            Manage your shared expenses and settle up with friends
          </p>
        </div>
        <Link href='/groups/create'>
          <Button className='flex items-center gap-2'>
            <Plus className='w-4 h-4' />
            New Group
          </Button>
        </Link>
      </div>

      {/* Error Display */}
      {error && (
        <Card className='border-red-200 bg-red-50'>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-2 text-red-700'>
              <Receipt className='w-4 h-4' />
              <p>{error}</p>
              <Button variant='outline' size='sm' onClick={fetchDashboardData} className='ml-auto'>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Active Groups</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{groups.length}</div>
            <p className='text-xs text-muted-foreground'>{totalMembers} total members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Expenses</CardTitle>
            <Receipt className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>${totalExpenses.toFixed(2)}</div>
            <p className='text-xs text-muted-foreground'>Across all groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Your Balance</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              ${Math.abs(totalBalance).toFixed(2)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {totalBalance >= 0 ? 'You are owed' : 'You owe'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Groups Section */}
      <div>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-2xl font-semibold'>Your Groups</h2>
          <Link href='/groups'>
            <Button variant='outline'>View All</Button>
          </Link>
        </div>

        {isLoadingData ? (
          <div className='text-center py-8'>Loading your groups...</div>
        ) : groups.length === 0 ? (
          <Card className='text-center py-8'>
            <CardContent className='pt-6'>
              <Users className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
              <h3 className='text-lg font-semibold mb-2'>No groups yet</h3>
              <p className='text-muted-foreground mb-4'>
                Create your first group to start tracking shared expenses
              </p>
              <Link href='/groups/create'>
                <Button>
                  <Plus className='w-4 h-4 mr-2' />
                  Create Your First Group
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {groups.map((group) => (
              <Card key={group.id} className='hover:shadow-md transition-shadow cursor-pointer'>
                <Link href={`/groups/${group.id}`}>
                  <CardHeader>
                    <CardTitle className='flex items-center justify-between'>
                      {group.name}
                      <span className='text-sm text-muted-foreground'>
                        {group.member_count} members
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Total expenses: ${(group.total_expenses || 0).toFixed(2)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='flex justify-between items-center'>
                      <span className='text-sm text-muted-foreground'>Your balance:</span>
                      <span
                        className={`font-semibold ${
                          (group.user_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {(group.user_balance || 0) >= 0 ? '+' : ''}$
                        {(group.user_balance || 0).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className='text-2xl font-semibold mb-4'>Recent Activity</h2>
        <Card>
          <CardContent className='pt-6'>
            {isLoadingData ? (
              <div className='text-center py-8'>Loading recent activity...</div>
            ) : recentExpenses.length === 0 ? (
              <div className='text-center text-muted-foreground py-8'>
                <Receipt className='w-12 h-12 mx-auto mb-4' />
                <p>No recent activity</p>
                <p className='text-sm'>Your expense activity will appear here</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {recentExpenses.slice(0, 5).map((expense) => (
                  <div
                    key={expense.id}
                    className='flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0'
                  >
                    <div className='flex items-center gap-3'>
                      <Receipt className='w-4 h-4 text-muted-foreground' />
                      <div>
                        <p className='font-medium'>{expense.description}</p>
                        <p className='text-sm text-muted-foreground'>
                          {new Date(expense.date_of_expense).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='font-semibold'>
                        ${parseFloat(expense.total_amount.toString()).toFixed(2)}
                      </p>
                      <p className='text-sm text-muted-foreground capitalize'>{expense.status}</p>
                    </div>
                  </div>
                ))}
                {recentExpenses.length > 5 && (
                  <div className='text-center pt-4'>
                    <Link href='/expenses'>
                      <Button variant='outline' size='sm'>
                        View All Activity
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
