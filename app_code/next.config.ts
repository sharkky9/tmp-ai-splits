import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },

  // Image optimization for better performance
  images: {
    domains: ['images.unsplash.com'], // Add any external image domains
    formats: ['image/webp', 'image/avif'],
  },

  // ESLint configuration
  eslint: {
    // Allow production builds to succeed even with ESLint errors
    ignoreDuringBuilds: true,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

// Previously, this was defined as `sentryWebpackPluginOptions`. Renaming for clarity with wizard's merge.
const sentryOptions = {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  org: process.env.SENTRY_ORG || 'block-m5', // Fallback to wizard-provided if env var not set
  project: process.env.SENTRY_PROJECT || 'tmp-ai-splits', // Fallback to wizard-provided

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Transpiles SDK to be compatible with IE11 (increases bundle size) - Keeping our original false
  transpileClientSDK: false,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors.
  automaticVercelMonitors: true,

  // Ensure Sentry builds are uploaded even if there are no errors.
  // Useful for verifying source map uploads.
  // Note: This option might not be directly available in `withSentryConfig` options,
  // but is a common setting for the Sentry Webpack Plugin.
  // We are keeping the options that were common between our setup and the wizard's.
  // If specific CLI options are needed, they are usually passed to the Sentry CLI directly.
}

export default withSentryConfig(nextConfig, sentryOptions)
