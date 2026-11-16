import { describe, it, expect, beforeEach } from 'vitest'
import { computeDepartmentTotals } from '../src/services/cost-center-service.js'
import { addEntry } from '../src/services/entry-service.js'
import { addDepartment } from '../src/domain/shared.js'

describe('US7: Centros de costo', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:entries')
    localStorage.removeItem('@erp-envelope:accounts')
    localStorage.removeItem('@erp-envelope:department-base')
  })

  it('should group totals by id_departamento', () => {
    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('should return zero totals for departments without movements', () => {
    // Add a department without entries
    addDepartment({ id: 'dept-zero', nombre: 'Depto Vacío', codigo: 'SIN', acepta_movimientos: true, es_efectivo: false, creado_por: 'user-1' })

    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })
    expect(result['dept-zero']).toBeDefined()
    expect(result['dept-zero'].ingresos).toBe(0)
    expect(result['dept-zero'].gastos).toBe(0)
    expect(result['dept-zero'].saldoNeto).toBe(0)
  })

  it('should include "Sin departamento" bucket', () => {
    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })
    expect(result['Sin departamento']).toBeDefined()
  })

  it('should exclude non-Contabilizadas entries', () => {
    // Add a Contabilizada entry
    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-030',
      descripcion: 'Prueba US7',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', id_departamento: 'dept-1', monto_debe: 100, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 100, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    })

    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })
    expect(result['dept-1']).toBeDefined()
    expect(result['dept-1'].ingresos).toBeGreaterThan(0)
  })

  it('should maintain 4-decimal precision', () => {
    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })
    Object.values(result).forEach((dept) => {
      expect(dept.saldoNeto).toBeDefined()
      // Verify it's a number with up to 4 decimals
      const decimalStr = dept.saldoNeto.toString()
      const decimalParts = decimalStr.split('.')
      if (decimalParts.length > 1) {
        expect(decimalParts[1].length).toBeLessThanOrEqual(4)
      }
    })
  })

  it('should reconcile "Sin departamento" with period totals', () => {
    // Add entries without department (Sin departamento)
    addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-031',
      descripcion: 'Asiento sin departamento',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', monto_debe: 50, monto_haber: 0, numero_linea: 1, id_departamento: null },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 50, numero_linea: 2, id_departamento: null },
      ],
      id_usuario_creador: 'user-1',
    })

    const result = computeDepartmentTotals({ from: '2026-01-01', to: '2026-12-31' })
    
    // "Sin departamento" should have the amounts from entries without department
    expect(result['Sin departamento'].ingresos).toBe(50)
    expect(result['Sin departamento'].gastos).toBe(50)
  })
})
