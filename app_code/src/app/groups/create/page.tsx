'use client'

import { GroupCreateForm } from '@/components/Groups/GroupCreateForm'
import { useAuthContext } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CreateGroupPage() {
  const { user, isLoading: isAuthLoading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login?message=Please login to create a group')
    }
  }, [user, isAuthLoading, router])

  if (isAuthLoading) {
    return <p>Loading user...</p> // Or a proper loading spinner
  }

  if (!user) {
    return null // or a message, though useEffect should redirect
  }

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-6'>Create New Group</h1>
      <div className='max-w-md mx-auto'>
        <GroupCreateForm />
      </div>
    </div>
  )
}
