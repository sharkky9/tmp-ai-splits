/**
 * Analytics and User Journey Tracking for Production
 * Tracks user behavior, success metrics, and business KPIs
 */

// User journey events
export type AnalyticsEvent =
  | 'app_loaded'
  | 'user_signed_up'
  | 'user_signed_in'
  | 'user_signed_out'
  | 'group_created'
  | 'group_joined'
  | 'expense_started'
  | 'expense_completed'
  | 'expense_corrected'
  | 'settlement_calculated'
  | 'settlement_viewed'
  | 'llm_parse_success'
  | 'llm_parse_failure'
  | 'error_occurred'
  | 'page_view'

interface AnalyticsProperties {
  [key: string]: string | number | boolean | undefined
}

interface UserJourneyStep {
  event: AnalyticsEvent
  timestamp: Date
  properties: AnalyticsProperties
  sessionId: string
  userId?: string
}

class AnalyticsTracker {
  private sessionId: string
  private userId?: string
  private journeySteps: UserJourneyStep[] = []
  private sessionStartTime: Date

  constructor() {
    this.sessionId = this.generateSessionId()
    this.sessionStartTime = new Date()

    // Track initial app load
    this.track('app_loaded', {
      timestamp: this.sessionStartTime.toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    })
  }

  /**
   * Set user context for analytics
   */
  setUser(userId: string): void {
    this.userId = userId
  }

  /**
   * Track an analytics event
   */
  track(event: AnalyticsEvent, properties: AnalyticsProperties = {}): void {
    const step: UserJourneyStep = {
      event,
      timestamp: new Date(),
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
      },
      sessionId: this.sessionId,
      userId: this.userId,
    }

    this.journeySteps.push(step)

    // Send to analytics providers
    this.sendToProviders(event, step.properties)

    // Keep only last 100 steps to prevent memory issues
    if (this.journeySteps.length > 100) {
      this.journeySteps = this.journeySteps.slice(-100)
    }
  }

  /**
   * Track page views
   */
  trackPageView(pageName: string, additionalProperties: AnalyticsProperties = {}): void {
    this.track('page_view', {
      page: pageName,
      url: typeof window !== 'undefined' ? window.location.href : '',
      referrer: typeof window !== 'undefined' ? document.referrer : '',
      ...additionalProperties,
    })
  }

  /**
   * Track user authentication events
   */
  trackAuth(action: 'signup' | 'signin' | 'signout', properties: AnalyticsProperties = {}): void {
    const eventMap = {
      signup: 'user_signed_up' as const,
      signin: 'user_signed_in' as const,
      signout: 'user_signed_out' as const,
    }

    this.track(eventMap[action], {
      authAction: action,
      ...properties,
    })
  }

  /**
   * Track group management events
   */
  trackGroup(
    action: 'created' | 'joined',
    groupId: string,
    properties: AnalyticsProperties = {}
  ): void {
    const eventMap = {
      created: 'group_created' as const,
      joined: 'group_joined' as const,
    }

    this.track(eventMap[action], {
      groupId,
      groupAction: action,
      ...properties,
    })
  }

  /**
   * Track expense workflow
   */
  trackExpense(
    action: 'started' | 'completed' | 'corrected',
    properties: AnalyticsProperties = {}
  ): void {
    const eventMap = {
      started: 'expense_started' as const,
      completed: 'expense_completed' as const,
      corrected: 'expense_corrected' as const,
    }

    this.track(eventMap[action], {
      expenseAction: action,
      ...properties,
    })
  }

  /**
   * Track LLM integration events
   */
  trackLLM(success: boolean, properties: AnalyticsProperties = {}): void {
    this.track(success ? 'llm_parse_success' : 'llm_parse_failure', {
      llmSuccess: success,
      ...properties,
    })
  }

  /**
   * Track settlement events
   */
  trackSettlement(action: 'calculated' | 'viewed', properties: AnalyticsProperties = {}): void {
    const eventMap = {
      calculated: 'settlement_calculated' as const,
      viewed: 'settlement_viewed' as const,
    }

    this.track(eventMap[action], {
      settlementAction: action,
      ...properties,
    })
  }

  /**
   * Track errors with context
   */
  trackError(error: Error, context: AnalyticsProperties = {}): void {
    this.track('error_occurred', {
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500), // Limit stack trace length
      errorName: error.name,
      ...context,
    })
  }

  /**
   * Get user journey summary
   */
  getUserJourney(): {
    sessionId: string
    userId?: string
    startTime: Date
    duration: number
    steps: UserJourneyStep[]
    summary: {
      totalEvents: number
      uniqueEvents: number
      pagesViewed: number
      errorsOccurred: number
    }
  } {
    const duration = Date.now() - this.sessionStartTime.getTime()
    const uniqueEvents = new Set(this.journeySteps.map((step) => step.event)).size
    const pagesViewed = this.journeySteps.filter((step) => step.event === 'page_view').length
    const errorsOccurred = this.journeySteps.filter(
      (step) => step.event === 'error_occurred'
    ).length

    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.sessionStartTime,
      duration,
      steps: this.journeySteps,
      summary: {
        totalEvents: this.journeySteps.length,
        uniqueEvents,
        pagesViewed,
        errorsOccurred,
      },
    }
  }

  /**
   * Get business metrics
   */
  getBusinessMetrics(): {
    expensesCreated: number
    expensesCorrected: number
    correctionRate: number
    settlementsCalculated: number
    llmSuccessRate: number
    errorRate: number
  } {
    const expensesCompleted = this.journeySteps.filter(
      (step) => step.event === 'expense_completed'
    ).length
    const expensesCorrected = this.journeySteps.filter(
      (step) => step.event === 'expense_corrected'
    ).length
    const settlementsCalculated = this.journeySteps.filter(
      (step) => step.event === 'settlement_calculated'
    ).length
    const llmSuccesses = this.journeySteps.filter(
      (step) => step.event === 'llm_parse_success'
    ).length
    const llmFailures = this.journeySteps.filter(
      (step) => step.event === 'llm_parse_failure'
    ).length
    const errors = this.journeySteps.filter((step) => step.event === 'error_occurred').length

    const correctionRate = expensesCompleted > 0 ? expensesCorrected / expensesCompleted : 0
    const llmSuccessRate =
      llmSuccesses + llmFailures > 0 ? llmSuccesses / (llmSuccesses + llmFailures) : 0
    const errorRate = this.journeySteps.length > 0 ? errors / this.journeySteps.length : 0

    return {
      expensesCreated: expensesCompleted,
      expensesCorrected,
      correctionRate,
      settlementsCalculated,
      llmSuccessRate,
      errorRate,
    }
  }

  /**
   * Send events to analytics providers
   */
  private sendToProviders(event: AnalyticsEvent, properties: AnalyticsProperties): void {
    // This is a placeholder for sending data to actual analytics services
    // (e.g., Segment, Mixpanel, Google Analytics, or your own backend)

    // Example: Send to a hypothetical analytics service (replace with actual integration)
    console.log('[Analytics]', event, properties)

    // if (typeof window !== 'undefined') {
    try {
      // Vercel Analytics
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== 'undefined' && (window as any).va) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).va('track', event, properties)
      }

      // Custom analytics endpoint
      if (
        typeof window !== 'undefined' &&
        process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true'
      ) {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event,
            properties,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {
          // Silently fail to not affect user experience
        })
      }
    } catch (error) {
      // Silently fail analytics
      console.debug('Analytics tracking failed:', error)
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Global analytics instance
let analyticsInstance: AnalyticsTracker | null = null

/**
 * Get or create analytics instance
 */
export function getAnalytics(): AnalyticsTracker {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsTracker()
  }
  return analyticsInstance
}

/**
 * Convenience functions for common tracking
 */
export const analytics = {
  track: (event: AnalyticsEvent, properties?: AnalyticsProperties) =>
    getAnalytics().track(event, properties),
  trackPageView: (pageName: string, properties?: AnalyticsProperties) =>
    getAnalytics().trackPageView(pageName, properties),
  trackAuth: (action: 'signup' | 'signin' | 'signout', properties?: AnalyticsProperties) =>
    getAnalytics().trackAuth(action, properties),
  trackGroup: (action: 'created' | 'joined', groupId: string, properties?: AnalyticsProperties) =>
    getAnalytics().trackGroup(action, groupId, properties),
  trackExpense: (action: 'started' | 'completed' | 'corrected', properties?: AnalyticsProperties) =>
    getAnalytics().trackExpense(action, properties),
  trackLLM: (success: boolean, properties?: AnalyticsProperties) =>
    getAnalytics().trackLLM(success, properties),
  trackSettlement: (action: 'calculated' | 'viewed', properties?: AnalyticsProperties) =>
    getAnalytics().trackSettlement(action, properties),
  trackError: (error: Error, context?: AnalyticsProperties) =>
    getAnalytics().trackError(error, context),
  setUser: (userId: string) => getAnalytics().setUser(userId),
}
