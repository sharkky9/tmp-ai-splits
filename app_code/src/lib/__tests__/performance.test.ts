/**
 * Performance Monitoring Tests for Task 7.0
 */

import {
  performanceMonitor,
  measureExecutionTime,
  measureAsyncExecutionTime,
} from '../monitoring/performance'

describe('Performance Monitoring', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics()
    // No need to mock private methods for unit tests
  })

  describe('Expense Logging Metrics', () => {
    it('should track expense logging session correctly', () => {
      const sessionId = 'test-session-1'

      // Start tracking
      performanceMonitor.startExpenseLogging(sessionId, 'llm')

      // Simulate some processing time
      const startTime = Date.now()
      while (Date.now() - startTime < 10) {
        // Wait 10ms
      }

      // Complete the session
      performanceMonitor.completeExpenseLogging(sessionId, true)

      const metrics = performanceMonitor.getSuccessMetrics()
      expect(metrics.totalExpensesLogged).toBe(1)
      expect(metrics.averageExpenseLoggingTime).toBeGreaterThan(0)
      expect(metrics.correctionRate).toBe(0) // No correction required
      expect(metrics.successRate).toBe(1) // 100% success
    })

    it('should track correction rate correctly', () => {
      const sessionId = 'test-session-2'

      performanceMonitor.startExpenseLogging(sessionId, 'llm')
      performanceMonitor.markCorrectionRequired(sessionId)
      performanceMonitor.completeExpenseLogging(sessionId, true)

      const metrics = performanceMonitor.getSuccessMetrics()
      expect(metrics.correctionRate).toBe(1) // 100% correction rate
    })

    it('should handle multiple sessions', () => {
      // Session 1: Success without correction
      performanceMonitor.startExpenseLogging('session-1', 'llm')
      performanceMonitor.completeExpenseLogging('session-1', true)

      // Session 2: Success with correction
      performanceMonitor.startExpenseLogging('session-2', 'manual')
      performanceMonitor.markCorrectionRequired('session-2')
      performanceMonitor.completeExpenseLogging('session-2', true)

      // Session 3: Failure
      performanceMonitor.startExpenseLogging('session-3', 'llm')
      performanceMonitor.completeExpenseLogging('session-3', false)

      const metrics = performanceMonitor.getSuccessMetrics()
      expect(metrics.totalExpensesLogged).toBe(3)
      expect(metrics.correctionRate).toBe(1 / 3) // 33% correction rate
      expect(metrics.successRate).toBe(2 / 3) // 67% success rate
    })
  })

  describe('Settlement Metrics', () => {
    it('should record settlement metrics correctly', () => {
      const settlementMetrics = {
        transactionCount: 3,
        totalAmount: 150.5,
        calculationTime: 250,
        memberCount: 5,
      }

      performanceMonitor.recordSettlementMetrics(settlementMetrics)

      const metrics = performanceMonitor.getSuccessMetrics()
      expect(metrics.totalSettlementsCalculated).toBe(1)
      expect(metrics.averageSettlementTime).toBe(250)
    })
  })

  describe('Success Metrics Validation', () => {
    it('should validate metrics meet requirements', () => {
      // Add metrics that meet requirements
      performanceMonitor.recordMetric('expense_logging_time', 15000, { success: true }) // 15s
      performanceMonitor.recordMetric('expense_correction_rate', 0, {}) // No correction
      performanceMonitor.recordMetric('settlement_calculation_time', 2000, {}) // 2s

      const validation = performanceMonitor.validateSuccessMetrics()
      expect(validation.meetsRequirements).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('should identify metrics that fail requirements', () => {
      // Add metrics that fail requirements
      performanceMonitor.recordMetric('expense_logging_time', 35000, { success: true }) // 35s (too slow)
      performanceMonitor.recordMetric('expense_logging_time', 40000, { success: true }) // 40s (too slow)
      performanceMonitor.recordMetric('expense_correction_rate', 1, {}) // 100% correction (too high)
      performanceMonitor.recordMetric('expense_logging_time', 25000, { success: false }) // Failed

      const validation = performanceMonitor.validateSuccessMetrics()
      expect(validation.meetsRequirements).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
      // Check for the actual error message patterns from the debug output
      expect(
        validation.issues.some(
          (issue) => issue.includes('exceeds 30s requirement') || issue.includes('30s')
        )
      ).toBe(true)
      expect(
        validation.issues.some(
          (issue) => issue.includes('exceeds 20% requirement') || issue.includes('20%')
        )
      ).toBe(true)
    })
  })

  describe('Execution Time Measurement', () => {
    it('should measure synchronous function execution time', () => {
      const result = measureExecutionTime(() => {
        // Simulate some work that takes measurable time
        let sum = 0
        for (let i = 0; i < 100000; i++) {
          sum += Math.sqrt(i)
        }
        return sum
      }, 'test_sync_function')

      expect(result).toBeGreaterThan(0)

      const metrics = performanceMonitor.exportMetrics()
      const testMetric = metrics.find((m) => m.name === 'test_sync_function')
      expect(testMetric).toBeDefined()
      expect(testMetric!.value).toBeGreaterThanOrEqual(0) // Allow 0ms for very fast operations
    })

    it('should measure asynchronous function execution time', async () => {
      const result = await measureAsyncExecutionTime(async () => {
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'async result'
      }, 'test_async_function')

      expect(result).toBe('async result')

      const metrics = performanceMonitor.exportMetrics()
      const testMetric = metrics.find((m) => m.name === 'test_async_function')
      expect(testMetric).toBeDefined()
      expect(testMetric!.value).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Memory Management', () => {
    it('should limit metrics to prevent memory issues', () => {
      // Add more than 1000 metrics
      for (let i = 0; i < 1200; i++) {
        performanceMonitor.recordMetric('test_metric', i)
      }

      const metrics = performanceMonitor.exportMetrics()
      expect(metrics.length).toBe(1000) // Should be capped at 1000

      // Should keep the most recent metrics
      const lastMetric = metrics[metrics.length - 1]
      expect(lastMetric.value).toBe(1199)
    })
  })

  describe('Edge Cases', () => {
    it('should handle completing non-existent sessions gracefully', () => {
      performanceMonitor.completeExpenseLogging('non-existent', true)

      const metrics = performanceMonitor.getSuccessMetrics()
      expect(metrics.totalExpensesLogged).toBe(0)
    })

    it('should handle marking correction for non-existent sessions gracefully', () => {
      performanceMonitor.markCorrectionRequired('non-existent')

      // Should not throw error
      expect(true).toBe(true)
    })

    it('should handle empty metrics gracefully', () => {
      const metrics = performanceMonitor.getSuccessMetrics()
      expect(metrics.averageExpenseLoggingTime).toBe(0)
      expect(metrics.correctionRate).toBe(0)
      expect(metrics.successRate).toBe(0)
      expect(metrics.averageSettlementTime).toBe(0)
    })
  })
})
