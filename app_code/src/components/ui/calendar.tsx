'use client'

import * as React from 'react'

// Temporary placeholder for Calendar component
// TODO: Restore react-day-picker when React 19 compatibility is available
function Calendar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      <div className='p-4 text-center text-muted-foreground'>
        Calendar component temporarily disabled
      </div>
    </div>
  )
}

export { Calendar }
