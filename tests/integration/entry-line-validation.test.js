import { describe, it, expect, beforeEach } from 'vitest';
import { amount } from '../src/utils/validation.js';
import { saveEntry } from '../src/services/entry-service.js';
import { addAccount } from '../src/services/account-service.js';
import { loadCollection } from '../storage.js';

describe('US11: Validación estricta de líneas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should show immediate error for five-decimal amount', () => {
    const result = amount('100.12345');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('El importe no puede tener más de 4 decimales');
  });

  it('should show immediate error for negative amount', () => {
    const result = amount('-5');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('El importe no puede ser negativo');
  });

  it('should show immediate error for zero amount', () => {
    const result = amount(0);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('El importe no puede ser cero');
  });

  it('should block save while an invalid (5-decimal) line exists, without rounding', () => {
    const result = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-090',
      descripcion: 'Prueba validación',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: '1', monto_debe: 100.12345, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: '2', monto_debe: 0, monto_haber: 100 },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('4 decimales');
  });

  it('should not persist any part of a rejected entry', () => {
    const before = loadCollection('entries').records.length;
    const result = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-091',
      descripcion: 'Preservar datos',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: '1', monto_debe: -5, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: '2', monto_debe: 0, monto_haber: 5 },
      ],
    });
    expect(result.success).toBe(false);
    expect(loadCollection('entries').records.length).toBe(before);
  });

  it('should reject a line referencing an inactive account', () => {
    addAccount({
      codigo: '9900',
      nombre: 'Cuenta Inactiva',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: false,
      activa: false,
    });
    const inactiveAccount = loadCollection('accounts').records.find((a) => a.codigo === '9900');

    const result = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-092',
      descripcion: 'Cuenta inactiva',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: inactiveAccount.id, monto_debe: 20, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: inactiveAccount.id, monto_debe: 0, monto_haber: 20 },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('inactiva');
  });

  it('should validate each amount change in ≤ 100 ms', () => {
    const start = performance.now();
    const validResult = amount('100.1200');
    const invalidResult = amount('100.12345');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
  });
});
