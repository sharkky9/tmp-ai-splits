// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Custom tags for filtering
  initialScope: {
    tags: {
      component: 'expense-splitting-app-server',
    },
  },

  // Custom beforeSend logic from our original sentry.ts
  beforeSend(event, hint) {
    if (event.exception) {
      const error = hint.originalException
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          return null // Don't send network errors
        }
      }
    }
    if (event.user) {
      delete event.user.email // Scrub sensitive PII
      delete event.user.username
    }
    return event
  },
})
