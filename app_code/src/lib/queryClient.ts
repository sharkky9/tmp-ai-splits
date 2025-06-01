import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time in milliseconds that data will be considered fresh
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Time in milliseconds that unused/inactive cache data remains in memory
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      // Retry failed requests
      retry: (failureCount: number, error: unknown) => {
        // Don't retry on 4xx errors (client errors)
        if (typeof error === 'object' && error !== null && 'status' in error) {
          const httpError = error as { status?: number }
          if (httpError.status && httpError.status >= 400 && httpError.status < 500) {
            return false
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus by default (can be overridden per query)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
      onError: (error: Error) => {
        // TODO: Implement global error handling, e.g., show a toast notification
        // For now, just log it
        console.error('Mutation error:', error.message)
      },
    },
  },
})
