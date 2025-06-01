'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Group } from '@/types/database'

interface GroupListItemProps {
  group: Group & { member_count?: number }
}

export function GroupListItem({ group }: GroupListItemProps) {
  const updatedAt = new Date(group.updated_at)
  const timeAgo = formatDistanceToNow(updatedAt, { addSuffix: true })

  return (
    <Link href={`/groups/${group.id}`} className='block'>
      <Card className='hover:shadow-md transition-shadow cursor-pointer'>
        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between'>
            <div className='space-y-1'>
              <CardTitle className='text-lg'>{group.name}</CardTitle>
              {group.description && (
                <CardDescription className='line-clamp-2'>{group.description}</CardDescription>
              )}
            </div>
            <Badge variant='secondary' className='ml-2'>
              <Users className='w-3 h-3 mr-1' />
              {group.member_count || 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='flex items-center text-sm text-gray-500'>
            <Calendar className='w-4 h-4 mr-1' />
            Updated {timeAgo}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
