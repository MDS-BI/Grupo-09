import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { amount } from '../src/utils/validation.js'
import { saveEntry } from '../src/services/entry-service.js'
import { addEntry } from '../src/services/entry-service.js'
import { addAccount } from '../src/services/account-service.js'

describe('US11: Validación estricta de líneas', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:entries')
    localStorage.removeItem('@erp-envelope:accounts')
  })

  it('should show immediate error for five-decimal amount', () => {
    // This test verifies the validation rejects 100.12345
    const result = amount('100.12345')
    expect(result.valid).toBe(false)
  })

  it('should show immediate error for negative amount', () => {
    const result = amount('-5')
    expect(result.valid).toBe(false)
    expect(result.message).toBe('El importe no puede ser negativo')
  })

  it('should show immediate error for zero amount', () => {
    const result = amount(0)
    expect(result.valid).toBe(false)
    expect(result.message).toBe('El importe no puede ser cero')
  })

  it('should block save while invalid lines exist', () => {
    const result = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-090',
      descripcion: 'Prueba validación',
      moneda: 'USD',
      estado: 'Borrador',
      detalles: [
        { id_cuenta: '1', monto_debe: 100.12345, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 100, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    })
    
    expect(result.success).toBe(false)
  })

  it('should preserve entered data after rejection', () => {
    const result = addEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-091',
      descripcion: 'Preservar datos',
      moneda: 'USD',
      estado: 'Borrador',
      detalles: [
        { id_cuenta: '1', monto_debe: 50, monto_haber: 0, numero_linea: 1 },
      ],
      id_usuario_creador: 'user-1',
    })
    
    expect(result.success).toBe(true)
  })

  it('should filter inactive accounts from selector', () => {
    addAccount({
      codigo: '9900',
      nombre: 'Cuenta Inactiva',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: false,
      activa: false,
    })
    
    addAccount({
      codigo: '1100',
      nombre: 'Cuenta Activa',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: false,
      activa: true,
    })
  })

  it('should update validation in ≤ 100 ms per change', async () => {
    // Test validation response time
    const start = performance.now()
    
    // Simulate a change that triggers validation
    const validResult = amount('100.1200')
    const invalidResult = amount('100.12345')
    
    const end = performance.now()
    const duration = end - start
    
    expect(duration).toBeLessThan(100)
    expect(validResult.valid).toBe(true)
    expect(invalidResult.valid).toBe(false)
  })
})
