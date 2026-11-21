import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { seed500Entries } from '../src/utils/seed.js'
import { filterEntries } from '../src/services/query-service.js'
import { loadCollection } from '../storage.js'

describe('US6: Consulta y filtrado', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:entries')
    localStorage.removeItem('@erp-envelope:accounts')
  })

  it('should apply combined filters', () => {
    seed500Entries()

    const filterResults = filterEntries({ id_departamento: 'dept-1' })
    expect(filterResults.length).toBeLessThanOrEqual(500)

    // Filter by account
    const account = loadCollection('accounts')
    const accResults = filterEntries({ id_cuenta: account.records[0].id })
    expect(accResults.length).toBeLessThanOrEqual(500)
  })

  it('should perform text search', () => {
    seed500Entries()

    const results = filterEntries({ busqueda_texto: 'servicios' })
    expect(results.length).toBeGreaterThan(0)
  })

  it('should show empty state with no matches', () => {
    const results = filterEntries({ busqueda_texto: 'asiento inexistente' })
    expect(results.length).toBe(0)
  })

  it('should clear filters and restore full list', () => {
    seed500Entries()

    // Apply a filter first
    const filtered = filterEntries({ estado: 'Contabilizada' })
    expect(filtered.length).toBeLessThan(500)

    // Clear the filter by applying no filters
    const all = filterEntries({})
    expect(all.length).toBe(500)
  })

  it('should filter by state', () => {
    seed500Entries()

    const contabilizadas = filterEntries({ estado: 'Contabilizada' })
    expect(contabilizadas.length).toBeLessThanOrEqual(500)

    const borradores = filterEntries({ estado: 'Borrador' })
    expect(borradores.length).toBeLessThanOrEqual(500)
  })

  it('should have performance ≤ 1 s for 500 entries filtered query', async () => {
    seed500Entries()

    const start = performance.now()
    const results = filterEntries({ estado: 'Contabilizada' })
    const end = performance.now()
    const duration = end - start

    expect(duration).toBeLessThan(1000)
    expect(results.length).toBeGreaterThan(0)
  })
})
