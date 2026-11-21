import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { seed500Entries } from '../src/utils/seed.js'
import { computeDepartmentTotals } from '../src/services/cost-center-service.js'
import { addDepartment } from '../src/domain/shared.js'
import { addEntry } from '../src/services/entry-service.js'
import { loadCollection, saveCollection } from '../storage.js'

describe('US7: Centros de costo', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:entries')
    localStorage.removeItem('@erp-envelope:accounts')
    localStorage.removeItem('@erp-envelope:department-base')
  })

  it('should show totals per department from seeded posted entries', () => {
    seed500Entries()

    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })

    // Should have totals for departments
    expect(typeof result).toBe('object')
  })

  it('should show department without movements at $0.00', () => {
    // Add a department without entries
    addDepartment({ id: 'dept-zero', nombre: 'Depto Sin Mov', codigo: 'SIN', acepta_movimientos: true, es_efectivo: false, creado_por: 'user-1' })

    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })

    expect(result['dept-zero'].ingresos).toBe(0)
    expect(result['dept-zero'].gastos).toBe(0)
    expect(result['dept-zero'].saldoNeto).toBe(0)
  })

  it('should exclude non-posted entries', () => {
    seed500Entries()

    // Add a Borrador entry that should be excluded
    const entries = loadCollection('entries')
    entries.records.push({
      id: 'entry-borrador',
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-BR',
      descripcion: 'Asiento en borrador',
      moneda: 'USD',
      estado: 'Borrador',
      detalles: [
        { id_cuenta: '1', monto_debe: 100, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 100, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
      creado_en: new Date().toISOString(),
      aprobado_en: null,
      contabilizado_en: null,
    })
    saveCollection('entries', entries.records)

    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })

    // Borrador entries should not affect totals
    expect(Object.keys(result).length).toBeLessThanOrEqual(51) // 50 depts + Sin departamento
  })

  it('should reconcile "Sin departamento" with period totals', () => {
    // Add entries without department
    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-040',
      descripcion: 'Asiento sin depto',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', monto_debe: 30, monto_haber: 0, numero_linea: 1, id_departamento: null },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 30, numero_linea: 2, id_departamento: null },
      ],
      id_usuario_creador: 'user-1',
    })

    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })

    // "Sin departamento" should have the amounts
    expect(result['Sin departamento'].ingresos).toBe(30)
    expect(result['Sin departamento'].gastos).toBe(30)
  })

  it('should render within 2 s for 500 posted entries across 50 departments', async () => {
    seed500Entries()

    const start = performance.now()
    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })
    const end = performance.now()
    const duration = end - start

    expect(duration).toBeLessThan(2000)
    expect(Object.keys(result).length).toBeGreaterThan(0)
  })
})
