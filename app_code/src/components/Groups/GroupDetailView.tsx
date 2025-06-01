'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useAuthContext } from '@/contexts/AuthContext'
import { AddMemberForm } from './AddMemberForm'
import { NLLExpenseInput } from '@/components/Expenses/NLLExpenseInput'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Users, Plus, Calendar, Settings } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Group, GroupMember, Profile } from '@/types/database'

interface GroupMemberWithProfile extends GroupMember {
  profiles: Profile | null
}

interface GroupDetailViewProps {
  groupId: string
}

export function GroupDetailView({ groupId }: GroupDetailViewProps) {
  const { user } = useAuthContext()
  const [showAddMember, setShowAddMember] = useState(false)

  // Fetch group details
  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
  } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single<Group>()

      if (error) throw error
      return data
    },
    enabled: !!groupId,
  })

  // Fetch group members
  const {
    data: members,
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(
          `
          *,
          profiles (id, name, email, created_at, updated_at)
        `
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as GroupMemberWithProfile[]
    },
    enabled: !!groupId,
  })

  // Check if current user is admin
  const isAdmin = members?.some((member) => member.user_id === user?.id && member.role === 'admin')

  if (groupLoading || membersLoading) {
    return (
      <div className='space-y-6'>
        <Card>
          <CardContent className='p-6'>
            <p className='text-center text-gray-500'>Loading group details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (groupError || membersError) {
    return (
      <div className='space-y-6'>
        <Card>
          <CardContent className='p-6'>
            <p className='text-center text-red-600'>
              Failed to load group: {groupError?.message || membersError?.message}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!group) {
    return (
      <div className='space-y-6'>
        <Card>
          <CardContent className='p-6'>
            <p className='text-center text-gray-500'>Group not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const updatedAt = new Date(group.updated_at)
  const timeAgo = formatDistanceToNow(updatedAt, { addSuffix: true })

  return (
    <div className='space-y-6'>
      {/* Group Header */}
      <Card>
        <CardHeader>
          <div className='flex items-start justify-between'>
            <div className='space-y-2'>
              <CardTitle className='text-2xl'>{group.name}</CardTitle>
              {group.description && (
                <CardDescription className='text-base'>{group.description}</CardDescription>
              )}
              <div className='flex items-center text-sm text-gray-500'>
                <Calendar className='w-4 h-4 mr-1' />
                Updated {timeAgo}
              </div>
            </div>
            {isAdmin && (
              <Button variant='outline' size='sm'>
                <Settings className='w-4 h-4 mr-2' />
                Settings
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Members Section */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <CardTitle className='text-xl'>Members</CardTitle>
              <Badge variant='secondary'>
                <Users className='w-3 h-3 mr-1' />
                {members?.length || 0}
              </Badge>
            </div>
            {isAdmin && (
              <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                <DialogTrigger asChild>
                  <Button size='sm'>
                    <Plus className='w-4 h-4 mr-2' />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Member to {group.name}</DialogTitle>
                    <DialogDescription>
                      Add a new member to the group by email or as a placeholder.
                    </DialogDescription>
                  </DialogHeader>
                  <AddMemberForm
                    groupId={groupId}
                    onSuccess={() => setShowAddMember(false)}
                    onCancel={() => setShowAddMember(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {members && members.length > 0 ? (
            <div className='space-y-3'>
              {members.map((member) => (
                <div
                  key={member.id}
                  className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                >
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                      <Users className='w-4 h-4 text-blue-600' />
                    </div>
                    <div>
                      <p className='font-medium'>
                        {member.is_placeholder
                          ? member.placeholder_name
                          : member.profiles?.name || 'Unknown'}
                      </p>
                      <p className='text-sm text-gray-500'>
                        {member.is_placeholder
                          ? member.email || 'No email provided'
                          : member.profiles?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center space-x-2'>
                    {member.is_placeholder && (
                      <Badge variant='outline' className='text-xs'>
                        Placeholder
                      </Badge>
                    )}
                    <Badge
                      variant={member.role === 'admin' ? 'default' : 'secondary'}
                      className='text-xs'
                    >
                      {member.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-center text-gray-500 py-8'>
              No members yet. Add some members to get started!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <Card>
        <CardHeader>
          <CardTitle className='text-xl'>Add Expense</CardTitle>
          <CardDescription>
            Use natural language to quickly add and split expenses with your group members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members && members.length > 0 ? (
            <NLLExpenseInput
              groupId={groupId}
              groupMembers={members}
              onSuccess={() => {
                // Refresh expenses or show success message
                console.log('Expense added successfully')
              }}
            />
          ) : (
            <p className='text-center text-gray-500 py-8'>
              Add some members to the group before adding expenses.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
