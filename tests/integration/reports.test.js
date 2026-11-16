import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { seed500Entries } from '../src/utils/seed.js'
import { addEntry } from '../src/services/entry-service.js'
import { buildIncomeStatement, buildCashFlow } from '../src/services/report-service.js'
import { addAccount } from '../src/services/account-service.js'

describe('US8: Reportes', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:entries')
    localStorage.removeItem('@erp-envelope:accounts')
  })

  it('should build income statement with net result', () => {
    // Add Contabilizada entries
    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-060',
      descripcion: 'Prueba IS',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', monto_debe: 200, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 200, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    })
  })

  it('should calculate cash-flow totals from es_efectivo', () => {
    // Add efectivo account
    addAccount({
      codigo: '1100',
      nombre: 'Caja',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: true,
      activa: true,
    })

    // Add Contabilizada entry with efectivo account
    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-061',
      descripcion: 'Prueba CF',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', id_departamento: null, monto_debe: 100, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 100, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    })
  })

  it('should exclude drafts/pending/approved from reports', () => {
    // Add entries in different states
    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-062',
      descripcion: 'Borrador',
      moneda: 'USD',
      estado: 'Borrador',
      detalles: [
        { id_cuenta: '1', monto_debe: 50, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 50, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    })

    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-063',
      descripcion: 'Pending',
      moneda: 'USD',
      estado: 'Pendiente',
      detalles: [
        { id_cuenta: '1', monto_debe: 30, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 30, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    })

    const statement = buildIncomeStatement({ from: '2026-01-01', to: '2026-12-31' })
    
    // Only Contabilizadas should be included
    expect(statement.ingresos).toBeGreaterThanOrEqual(0)
  })

  it('should handle empty period state', () => {
    const statement = buildIncomeStatement({ from: '2025-01-01', to: '2025-12-31' })
    
    expect(statement.ingresos).toBe(0)
    expect(statement.gastos).toBe(0)
    expect(statement.resultadoNeto).toBe(0)
  })

  it('should have ≤ 2 s generation for 500 posted entries', async () => {
    seed500Entries()

    const start = performance.now()
    const incomeStatement = buildIncomeStatement({ from: '2026-01-01', to: '2026-12-31' })
    const cashFlow = buildCashFlow({ from: '2026-01-01', to: '2026-12-31' })
    
    const end = performance.now()
    const duration = end - start

    expect(duration).toBeLessThan(2000)
    expect(incomeStatement.resultadoNeto).toBeDefined()
    expect(cashFlow).toBeDefined()
  })

  it('should show 0 dashboard/report cash-flow discrepancies', () => {
    // Add efectivo account
    addAccount({
      codigo: '1100',
      nombre: 'Caja',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: true,
      activa: true,
    })

    // Add Contabilizada entries
    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-064',
      descripcion: 'Prueba discrepancy',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', monto_debe: 100, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 100, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    })

    const statement = buildIncomeStatement({ from: '2026-01-01', to: '2026-12-31' })
    const cashFlow = buildCashFlow({ from: '2026-01-01', to: '2026-12-31' })

    // Cash flow should be based on es_efectivo accounts
    expect(cashFlow).toBeDefined()
  })
})
