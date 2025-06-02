'use client'

import React, { use } from 'react'
import { GroupDetailView } from '@/components/Groups/GroupDetailView'

interface GroupPageProps {
  params: Promise<{
    groupId: string
  }>
}

export default function GroupDetailPage({ params }: GroupPageProps) {
  const { groupId } = use(params)

  return (
    <div className='container mx-auto p-6'>
      <GroupDetailView groupId={groupId} />
    </div>
  )
}
