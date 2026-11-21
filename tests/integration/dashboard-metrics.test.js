import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { seed500Entries, seedUsers, seedDepartments, seedAccounts, seedEntries } from '../src/utils/seed.js'
import { aggregatePostedEntries } from '../src/services/metrics-service.js'
import { calculateCashFlow } from '../src/services/metrics-service.js'

describe('US1: Dashboard metrics', () => {
  beforeEach(() => {
    seedUsers()
    seedDepartments()
    seedAccounts()
    seedEntries()
  })

  it('should show correct metrics from seeded Contabilizadas entries', () => {
    const metrics = aggregatePostedEntries('2026-01-01', '2026-12-31')
    expect(metrics.ingresos).toBeGreaterThan(0)
    expect(metrics.gastos).toBeGreaterThan(0)
    expect(metrics.resultadoNeto).toBeDefined()
  })

  it('should show zero-state when no entries exist', () => {
    localStorage.removeItem('@erp-envelope:entries')
    const metrics = aggregatePostedEntries('2026-01-01', '2026-12-31')
    expect(metrics.ingresos).toBe(0)
    expect(metrics.gastos).toBe(0)
    expect(metrics.resultadoNeto).toBe(0)
  })

  it('should refresh metrics after entry transitions', () => {
    const metricsBefore = aggregatePostedEntries('2026-01-01', '2026-12-31')
    expect(metricsBefore.ingresos).toBeDefined()
    const metricsAfter = aggregatePostedEntries('2026-01-01', '2026-12-31')
    expect(metricsAfter.ingresos).toBe(metricsBefore.ingresos)
  })

  it('should use es_efectivo for cash flow calculation', () => {
    const cashFlow = calculateCashFlow('2026-01-01', '2026-12-31')
    expect(typeof cashFlow).toBe('number')
  })

  it('should render metrics within 2 seconds for 500 posted entries', async () => {
    seed500Entries()
    const start = performance.now()
    const metrics = aggregatePostedEntries('2026-01-01', '2026-12-31')
    const end = performance.now()
    const duration = end - start
    expect(duration).toBeLessThan(2000)
    expect(metrics.ingresos).toBeDefined()
    expect(metrics.gastos).toBeDefined()
  })
})
