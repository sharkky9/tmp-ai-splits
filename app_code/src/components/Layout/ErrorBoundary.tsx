'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { captureErrorWithContext } from '@/lib/monitoring/sentry'
import { analytics } from '@/lib/monitoring/analytics'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackComponent?: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName } = this.props

    // Track error in Sentry with context
    captureErrorWithContext(error, {
      component: componentName || 'unknown-component',
      action: 'component-error',
      additionalData: {
        errorBoundary: true,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId || undefined,
      },
    })

    // Track error in analytics
    analytics.trackError(error, {
      component: componentName || 'unknown-component',
      errorBoundary: true,
      errorId: this.state.errorId || undefined,
    })

    console.error('Error boundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent
      }

      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 px-4'>
          <div className='max-w-md w-full space-y-6 text-center'>
            <div className='flex justify-center'>
              <AlertTriangle className='h-12 w-12 text-red-500' />
            </div>

            <div className='space-y-4'>
              <h1 className='text-2xl font-bold text-gray-900'>Something went wrong</h1>
              <p className='text-gray-600'>
                Something went wrong. Don&apos;t worry, your data is safe and we&apos;ve been
                notified of this error.
              </p>
              {this.state.errorId && (
                <p className='text-sm text-gray-500 font-mono'>Error ID: {this.state.errorId}</p>
              )}
            </div>

            <div className='space-y-3'>
              <Button onClick={this.handleRetry} className='w-full' variant='default'>
                <RefreshCw className='w-4 h-4 mr-2' />
                Try Again
              </Button>

              <Button onClick={this.handleReload} variant='outline' className='w-full'>
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className='mt-6 text-left'>
                <summary className='cursor-pointer text-sm text-gray-500 hover:text-gray-700'>
                  Show technical details
                </summary>
                <pre className='mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40'>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Specialized error boundaries for different components
export function ExpenseErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName='expense-management'
      fallbackComponent={
        <div className='p-4 border border-red-200 rounded-lg bg-red-50'>
          <div className='flex items-center space-x-2 text-red-700'>
            <AlertTriangle className='h-5 w-5' />
            <h3 className='font-medium'>Expense Error</h3>
          </div>
          <p className='mt-1 text-sm text-red-600'>
            There was an issue with the expense feature. Please try refreshing the page.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function GroupErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName='group-management'
      fallbackComponent={
        <div className='p-4 border border-red-200 rounded-lg bg-red-50'>
          <div className='flex items-center space-x-2 text-red-700'>
            <AlertTriangle className='h-5 w-5' />
            <h3 className='font-medium'>Group Error</h3>
          </div>
          <p className='mt-1 text-sm text-red-600'>
            There was an issue with the group feature. Please try refreshing the page.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function SettlementErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName='settlement-calculation'
      fallbackComponent={
        <div className='p-4 border border-red-200 rounded-lg bg-red-50'>
          <div className='flex items-center space-x-2 text-red-700'>
            <AlertTriangle className='h-5 w-5' />
            <h3 className='font-medium'>Settlement Error</h3>
          </div>
          <p className='mt-1 text-sm text-red-600'>
            There was an issue calculating settlements. Please try refreshing the page.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
