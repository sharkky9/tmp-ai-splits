/**
 * Performance Monitoring and Analytics for Task 7.0
 * Tracks success metrics like correction rates and completion times
 * Enhanced with production monitoring, Vercel Analytics, and Core Web Vitals
 */

// import { startPerformanceTransaction, measureAsyncFunction } from './sentry' // Removed unused imports

interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  metadata?: Record<string, unknown>
}

interface ExpenseLoggingMetrics {
  startTime: number
  endTime?: number
  correctionRequired: boolean
  method: 'llm' | 'manual'
  success: boolean
}

interface SettlementMetrics {
  transactionCount: number
  totalAmount: number
  calculationTime: number
  memberCount: number
}

// Core Web Vitals tracking
interface WebVitalsMetric {
  id: string
  name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private expenseLoggingSessions: Map<string, ExpenseLoggingMetrics> = new Map()
  private webVitalsBuffer: WebVitalsMetric[] = []

  /**
   * Start tracking an expense logging session
   */
  startExpenseLogging(sessionId: string, method: 'llm' | 'manual'): void {
    this.expenseLoggingSessions.set(sessionId, {
      startTime: Date.now(),
      correctionRequired: false,
      method,
      success: false,
    })
  }

  /**
   * Mark that a correction was required during expense logging
   */
  markCorrectionRequired(sessionId: string): void {
    const session = this.expenseLoggingSessions.get(sessionId)
    if (session) {
      session.correctionRequired = true
    }
  }

  /**
   * Complete an expense logging session with Sentry tracking
   */
  completeExpenseLogging(sessionId: string, success: boolean): void {
    const session = this.expenseLoggingSessions.get(sessionId)
    if (session) {
      session.endTime = Date.now()
      session.success = success

      const duration = session.endTime - session.startTime

      // Track completion time metric
      this.recordMetric('expense_logging_time', duration, {
        method: session.method,
        correctionRequired: session.correctionRequired,
        success,
      })

      // Track correction rate metric
      this.recordMetric('expense_correction_rate', session.correctionRequired ? 1 : 0, {
        method: session.method,
      })

      // Send to analytics if enabled
      if (
        typeof window !== 'undefined' &&
        process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true'
      ) {
        this.sendAnalyticsEvent('expense_completed', {
          duration,
          method: session.method,
          success,
          correctionRequired: session.correctionRequired,
        })
      }

      this.expenseLoggingSessions.delete(sessionId)
    }
  }

  /**
   * Record settlement calculation metrics with enhanced tracking
   */
  recordSettlementMetrics(metrics: SettlementMetrics): void {
    this.recordMetric('settlement_transaction_count', metrics.transactionCount, {
      memberCount: metrics.memberCount,
      totalAmount: metrics.totalAmount,
    })

    this.recordMetric('settlement_calculation_time', metrics.calculationTime, {
      memberCount: metrics.memberCount,
      transactionCount: metrics.transactionCount,
    })

    this.recordMetric('settlement_total_amount', metrics.totalAmount, {
      memberCount: metrics.memberCount,
      transactionCount: metrics.transactionCount,
    })

    // Send to analytics
    if (
      typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true'
    ) {
      this.sendAnalyticsEvent('settlement_calculated', {
        transactionCount: metrics.transactionCount,
        memberCount: metrics.memberCount,
        calculationTime: metrics.calculationTime,
      })
    }
  }

  /**
   * Record Core Web Vitals
   */
  recordWebVital(metric: WebVitalsMetric): void {
    this.webVitalsBuffer.push(metric)

    // Send to analytics
    if (
      typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true'
    ) {
      this.sendAnalyticsEvent('web_vital', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
      })
    }
  }

  /**
   * Track page performance
   */
  trackPagePerformance(pageName: string): void {
    if (typeof window !== 'undefined') {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart
        const firstByte = navigation.responseStart - navigation.fetchStart

        this.recordMetric('page_load_time', loadTime, { page: pageName })
        this.recordMetric('dom_content_loaded', domContentLoaded, { page: pageName })
        this.recordMetric('time_to_first_byte', firstByte, { page: pageName })

        // Send to analytics
        if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true') {
          this.sendAnalyticsEvent('page_performance', {
            page: pageName,
            loadTime,
            domContentLoaded,
            firstByte,
          })
        }
      }
    }
  }

  /**
   * Track API performance
   */
  trackAPIPerformance(endpoint: string, duration: number, success: boolean): void {
    this.recordMetric('api_response_time', duration, {
      endpoint,
      success,
    })

    // Send to analytics
    if (
      typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true'
    ) {
      this.sendAnalyticsEvent('api_call', {
        endpoint,
        duration,
        success,
      })
    }
  }

  /**
   * Send analytics event (compatible with Vercel Analytics)
   */
  private sendAnalyticsEvent(
    eventName: string,
    properties: Record<string, string | number | boolean | undefined | null>
  ): void {
    try {
      // Vercel Analytics integration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== 'undefined' && (window as any).va) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).va('track', eventName, properties)
      }

      // Custom analytics endpoint (if needed)
      if (typeof window !== 'undefined') {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: eventName, properties }),
        }).catch(() => {
          // Silently fail analytics to not affect user experience
        })
      }
    } catch (error) {
      // Silently fail analytics
      console.debug('Analytics event failed:', error)
    }
  }

  /**
   * Record a generic performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    this.metrics.push({
      name,
      value,
      timestamp: new Date(),
      metadata,
    })

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  /**
   * Get success metrics summary
   */
  getSuccessMetrics(): {
    averageExpenseLoggingTime: number
    correctionRate: number
    successRate: number
    averageSettlementTime: number
    totalExpensesLogged: number
    totalSettlementsCalculated: number
  } {
    const expenseTimings = this.metrics.filter((m) => m.name === 'expense_logging_time')
    const corrections = this.metrics.filter((m) => m.name === 'expense_correction_rate')
    const settlementTimings = this.metrics.filter((m) => m.name === 'settlement_calculation_time')

    const averageExpenseLoggingTime =
      expenseTimings.length > 0
        ? expenseTimings.reduce((sum, m) => sum + m.value, 0) / expenseTimings.length
        : 0

    const correctionRate =
      corrections.length > 0
        ? corrections.reduce((sum, m) => sum + m.value, 0) / corrections.length
        : 0

    const successRate =
      expenseTimings.length > 0
        ? expenseTimings.filter((m) => m.metadata?.success).length / expenseTimings.length
        : 0

    const averageSettlementTime =
      settlementTimings.length > 0
        ? settlementTimings.reduce((sum, m) => sum + m.value, 0) / settlementTimings.length
        : 0

    return {
      averageExpenseLoggingTime,
      correctionRate,
      successRate,
      averageSettlementTime,
      totalExpensesLogged: expenseTimings.length,
      totalSettlementsCalculated: settlementTimings.length,
    }
  }

  /**
   * Check if success metrics meet requirements
   */
  validateSuccessMetrics(): {
    meetsRequirements: boolean
    issues: string[]
  } {
    const metrics = this.getSuccessMetrics()
    const issues: string[] = []

    // Check average expense logging time < 30 seconds (30000ms)
    if (metrics.averageExpenseLoggingTime > 30000) {
      issues.push(
        `Average expense logging time (${Math.round(metrics.averageExpenseLoggingTime / 1000)}s) exceeds 30s requirement`
      )
    }

    // Check correction rate < 20% (0.2)
    if (metrics.correctionRate > 0.2) {
      issues.push(
        `LLM correction rate (${Math.round(metrics.correctionRate * 100)}%) exceeds 20% requirement`
      )
    }

    // Check success rate > 90% (0.9)
    if (metrics.successRate < 0.9) {
      issues.push(`Success rate (${Math.round(metrics.successRate * 100)}%) below 90% target`)
    }

    return {
      meetsRequirements: issues.length === 0,
      issues,
    }
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = []
    this.expenseLoggingSessions.clear()
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Utility function to measure function execution time
 */
export function measureExecutionTime<T>(
  fn: () => T,
  metricName: string,
  metadata?: Record<string, unknown>
): T {
  const startTime = Date.now()
  const result = fn()
  const endTime = Date.now()

  performanceMonitor.recordMetric(metricName, endTime - startTime, metadata)

  return result
}

/**
 * Utility function to measure async function execution time
 */
export async function measureAsyncExecutionTime<T>(
  fn: () => Promise<T>,
  metricName: string,
  metadata?: Record<string, unknown>
): Promise<T> {
  const startTime = Date.now()
  const result = await fn()
  const endTime = Date.now()

  performanceMonitor.recordMetric(metricName, endTime - startTime, metadata)

  return result
}

/**
 * React hook for tracking component render performance
 */
export function usePerformanceTracking(componentName: string) {
  const startTime = Date.now()

  return {
    recordRenderTime: () => {
      const endTime = Date.now()
      performanceMonitor.recordMetric('component_render_time', endTime - startTime, {
        component: componentName,
      })
    },
  }
}
