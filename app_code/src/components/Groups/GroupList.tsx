'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useAuthContext } from '@/contexts/AuthContext'
import { GroupListItem } from './GroupListItem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Group } from '@/types/database'

interface GroupWithMemberCount extends Group {
  member_count: number
}

export function GroupList() {
  const { user } = useAuthContext()

  const {
    data: groups,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')

      // Fetch groups where user is a member, with member count
      const { data, error } = await supabase
        .from('groups')
        .select(
          `
          *,
          group_members!inner(user_id),
          member_count:group_members(count)
        `
        )
        .eq('group_members.user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Transform the data to include member count
      const groupsWithCount: GroupWithMemberCount[] = data.map(
        (group: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
          member_count?: [{ count: number }]
        }) => ({
          ...group,
          member_count: group.member_count?.[0]?.count || 0,
        })
      )

      return groupsWithCount
    },
    enabled: !!user,
  })

  if (!user) {
    return (
      <Card>
        <CardContent className='p-6'>
          <p className='text-center text-gray-500'>Please log in to view your groups.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <p className='text-center text-gray-500'>Loading your groups...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className='p-6'>
          <p className='text-center text-red-600'>Failed to load groups: {error.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (!groups || groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Groups Yet</CardTitle>
          <CardDescription>
            Create your first group to start tracking shared expenses.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-2xl font-bold'>Your Groups</h2>
      <div className='grid gap-4'>
        {groups.map((group) => (
          <GroupListItem key={group.id} group={group} />
        ))}
      </div>
    </div>
  )
}
