// This file configures the Sentry client. It is automatically loaded by Next.js.
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // Our custom rate

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false, // Keep false for production, true for local debugging if needed

  // Enable Replay for session recording
  replaysSessionSampleRate: 0.1, // Our custom rate
  replaysOnErrorSampleRate: 1.0, // Our custom rate, Capture 100% of sessions with an error

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration({
      // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
      // tracePropagationTargets: ["localhost", /^https?:\/\/yourserver\.io\/api/],
    }),
  ],

  // Custom tags for filtering
  initialScope: {
    tags: {
      component: 'expense-splitting-app-client',
    },
  },

  // Custom beforeSend logic
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

// Required by Sentry to instrument navigations:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/instrumentation/custom-instrumentation/
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
