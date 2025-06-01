'use client'

import React, { useState } from 'react'
import { GroupList } from '@/components/Groups/GroupList'
import { GroupCreateForm } from '@/components/Groups/GroupCreateForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'

export default function GroupsPage() {
  const { user, isLoading } = useAuthContext()
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  if (isLoading) {
    return (
      <div className='container mx-auto p-6'>
        <div className='text-center'>
          <p className='text-gray-500'>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className='container mx-auto p-6'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold mb-4'>Welcome to Expense Splitter</h1>
          <p className='text-gray-500'>Please log in to view your groups.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-3xl font-bold'>Groups</h1>
        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogTrigger asChild>
            <Button>
              <Plus className='w-4 h-4 mr-2' />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a group to start tracking shared expenses with friends or family.
              </DialogDescription>
            </DialogHeader>
            <GroupCreateForm
              onSuccess={() => setShowCreateGroup(false)}
              onCancel={() => setShowCreateGroup(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <GroupList />
    </div>
  )
}
