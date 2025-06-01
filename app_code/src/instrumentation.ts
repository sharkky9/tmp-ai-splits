import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }

  // Client-side Sentry initialization is now handled by src/instrumentation-client.ts,
  // which is automatically loaded by Next.js in the browser.
  // No longer need to import sentry.client.config.ts here.
}

export const onRequestError = Sentry.captureRequestError
