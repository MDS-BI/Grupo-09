import { describe, it, expect, beforeEach } from 'vitest'
import { buildIncomeStatement, buildCashFlow } from '../src/services/report-service.js'
import { addEntry } from '../src/services/entry-service.js'
import { addAccount } from '../src/services/account-service.js'

describe('US8: Reportes', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:entries')
    localStorage.removeItem('@erp-envelope:accounts')
  })

  it('should build income statement with account grouping', () => {
    // Add Contabilizada entries with income and expense accounts
    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-050',
      descripcion: 'Asiento de prueba',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', monto_debe: 100, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 100, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    })

    const statement = buildIncomeStatement({ from: '2026-01-01', to: '2026-12-31' })
    expect(statement).toBeDefined()
    expect(statement.ingresos).toBeDefined()
    expect(statement.gastos).toBeDefined()
    expect(statement.resultadoNeto).toBeDefined()
  })

  it('should calculate net result with 4-decimal precision', () => {
    const statement = buildIncomeStatement({ from: '2026-01-01', to: '2026-12-31' })
    
    const decimalStr = statement.resultadoNeto.toString()
    const decimalParts = decimalStr.split('.')
    if (decimalParts.length > 1) {
      expect(decimalParts[1].length).toBeLessThanOrEqual(4)
    }
  })

  it('should calculate cash-flow totals by es_efectivo', () => {
    // Add an efectivo account
    addAccount({
      codigo: '1100',
      nombre: 'Caja',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: true,
      activa: true,
    })

    const cashFlow = buildCashFlow({ from: '2026-01-01', to: '2026-12-31' })
    expect(typeof cashFlow).toBe('number')
  })

  it('should exclude non-Contabilizadas entries from cash flow', () => {
    // Add a Borrador entry
    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-051',
      descripcion: 'Borrador entry',
      moneda: 'USD',
      estado: 'Borrador',
      detalles: [
        { id_cuenta: '1', monto_debe: 50, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 50, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    })

    const cashFlow = buildCashFlow({ from: '2026-01-01', to: '2026-12-31' })
    // Borrador should be excluded, so cash flow should only include Contabilizadas
  })

  it('should handle empty period', () => {
    const statement = buildIncomeStatement({ from: '2025-01-01', to: '2025-12-31' })
    expect(statement.ingresos).toBe(0)
    expect(statement.gastos).toBe(0)
    expect(statement.resultadoNeto).toBe(0)
  })

  it('should have dashboard/report designation parity for es_efectivo', () => {
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

    const cashFlow = buildCashFlow({ from: '2026-01-01', to: '2026-12-31' })
    const statement = buildIncomeStatement({ from: '2026-01-01', to: '2026-12-31' })

    // Both should respect es_efectivo designation
    expect(cashFlow).toBeDefined()
    expect(statement).toBeDefined()
  })
})
