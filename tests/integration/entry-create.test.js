import { describe, it, expect, beforeEach } from 'vitest';
import { saveEntry } from '../src/services/entry-service.js';
import { seedAccounts } from '../src/utils/seed.js';
import { loadCollection } from '../storage.js';

describe('US3: Registro de asientos por partida doble', () => {
  beforeEach(() => {
    localStorage.clear();
    seedAccounts();
  });

  it('should save a balanced draft entry with at least two lines', () => {
    const result = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-010',
      descripcion: 'Asiento balanceado',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 150, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 150 },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.entry.estado).toBe('Borrador');
    expect(loadCollection('entries').records.some((e) => e.id === result.entry.id)).toBe(true);
  });

  it('should block an unbalanced entry (Debe ≠ Haber)', () => {
    const result = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-011',
      descripcion: 'Asiento desbalanceado',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 200, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 150 },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('Debe debe ser exactamente igual al total de Haber');
  });

  it('should reject a line with amounts on both Debe and Haber', () => {
    const result = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-012',
      descripcion: 'Línea inválida',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 100, monto_haber: 50 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 100 },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('ambos lados');
  });

  it('should reject an entry with fewer than two lines', () => {
    const result = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-013',
      descripcion: 'Una sola línea',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [{ numero_linea: 1, id_cuenta: 'account-1', monto_debe: 100, monto_haber: 0 }],
    });

    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('al menos 2 líneas');
  });

  it('should reject a line referencing an inactive account', () => {
    const result = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-014',
      descripcion: 'Cuenta inexistente',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-does-not-exist', monto_debe: 100, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 100 },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('no encontrada');
  });
});
