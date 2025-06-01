import * as Sentry from '@sentry/nextjs'
import { User } from '@supabase/auth-helpers-nextjs'

// Sentry.init is now handled by sentry.client.config.ts, sentry.server.config.ts,
// and sentry.edge.config.ts, loaded via instrumentation.ts.
// We keep the helper functions here.

// Set user context for error tracking
export function setSentryUser(user: User | null) {
  Sentry.setUser(
    user
      ? {
          id: user.id,
          email: user.email, // Ensure this is okay with your privacy policy if not already scrubbed by beforeSend
        }
      : null
  )
}

// Custom error capture with context
export function captureErrorWithContext(
  error: Error,
  context: {
    component?: string
    action?: string
    userId?: string
    additionalData?: Record<string, unknown>
  }
) {
  Sentry.withScope((scope) => {
    // Set context tags
    if (context.component) scope.setTag('component', context.component)
    if (context.action) scope.setTag('action', context.action)
    if (context.userId) scope.setUser({ id: context.userId })

    // Add additional context
    if (context.additionalData) {
      scope.setContext('additionalData', context.additionalData)
    }

    // Capture the error
    Sentry.captureException(error)
  })
}

// Performance tracking helpers
export function startPerformanceTransaction(name: string) {
  return Sentry.startSpan(
    {
      name,
      op: 'custom.performance',
    },
    () => {
      // Return a transaction-like object for compatibility
      return {
        setStatus: (status: string) => {
          Sentry.setTag('transaction.status', status)
        },
        finish: () => {
          // Span automatically finishes when the callback completes
        },
      }
    }
  )
}

export function measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: 'custom.performance.async',
    },
    async () => {
      try {
        const result = await fn()
        Sentry.setTag('transaction.status', 'ok')
        return result
      } catch (error) {
        Sentry.setTag('transaction.status', 'internal_error')
        throw error
      }
    }
  )
}

// Expense-specific error tracking
export function trackExpenseError(
  error: Error,
  context: {
    expenseId?: string
    groupId?: string
    action: 'create' | 'update' | 'delete' | 'parse' | 'calculate'
    llmResponse?: unknown
  }
) {
  captureErrorWithContext(error, {
    component: 'expense-management',
    action: context.action,
    additionalData: {
      expenseId: context.expenseId,
      groupId: context.groupId,
      llmResponse: context.llmResponse ? JSON.stringify(context.llmResponse) : undefined,
    },
  })
}

// Group management error tracking
export function trackGroupError(
  error: Error,
  context: {
    groupId?: string
    action: 'create' | 'update' | 'delete' | 'join' | 'leave'
    memberCount?: number
  }
) {
  captureErrorWithContext(error, {
    component: 'group-management',
    action: context.action,
    additionalData: {
      groupId: context.groupId,
      memberCount: context.memberCount,
    },
  })
}

// LLM integration error tracking
export function trackLLMError(
  error: Error,
  context: {
    provider: 'openai'
    model?: string
    inputText?: string
    action: 'parse-expense' | 'calculate-settlement'
  }
) {
  captureErrorWithContext(error, {
    component: 'llm-integration',
    action: context.action,
    additionalData: {
      provider: context.provider,
      model: context.model,
      inputLength: context.inputText?.length,
      // Don't include full input text for privacy
    },
  })
}

// Database error tracking
export function trackDatabaseError(
  error: Error,
  context: {
    operation: 'select' | 'insert' | 'update' | 'delete'
    table: string
    userId?: string
  }
) {
  captureErrorWithContext(error, {
    component: 'database',
    action: context.operation,
    additionalData: {
      table: context.table,
      errorMessage: error.message,
    },
  })
}
