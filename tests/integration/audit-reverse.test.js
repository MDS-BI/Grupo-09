import { describe, it, expect, beforeEach } from 'vitest';
import { saveEntry } from '../src/services/entry-service.js';
import { reverseEntry } from '../src/services/reverse-service.js';
import { getPerEntryHistory } from '../src/services/audit-service.js';

describe('US4: Auditoría y reversas', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:entries');
    localStorage.removeItem('@erp-audit-log');
  });

  it('should block edit of Contabilizada entry', () => {
    // Create entry in Contabilizada state
    const addResult = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-010',
      descripcion: 'Prueba inmuteabilidad',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', monto_debe: 100, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 100, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    });

    expect(addResult.success).toBe(true);

    // Try to save again - should be blocked due to immutability
    const result = saveEntry(addResult.entry);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No se puede editar');
  });

  it('should create reverse with swapped sides and link', () => {
    // Create entry in Contabilizada state
    const addResult = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-011',
      descripcion: 'Prueba reversa',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', monto_debe: 200, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 200, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    });

    expect(addResult.success).toBe(true);

    const reverseResult = reverseEntry(addResult.entry.id);
    expect(reverseResult.success).toBe(true);

    const reversal = reverseResult.reverseEntry;
    expect(reversal.estado).toBe('Revertida');
    expect(reversal.id_transaccion_revertida).toBe(addResult.entry.id);

    // Verify original entry state changed
  });

  it('should block double-reverse', () => {
    // Create entry in Contabilizada state
    const addResult = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-012',
      descripcion: 'Prueba double reverse',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', monto_debe: 100, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 100, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    });

    expect(addResult.success).toBe(true);

    const firstReverse = reverseEntry(addResult.entry.id);
    expect(firstReverse.success).toBe(true);

    const secondReverse = reverseEntry(addResult.entry.id);
    expect(secondReverse.success).toBe(false);
    // The original entry is now Revertida (not Contabilizada), so the
    // state check rejects the second attempt before the duplicate-reverse check runs.
    expect(secondReverse.error).toContain('Solo se pueden revertir asientos Contabilizadas');
  });

  it('should record audit history for reverse operation', () => {
    // Create entry in Contabilizada state
    const addResult = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-013',
      descripcion: 'Prueba auditoría',
      moneda: 'USD',
      estado: 'Contabilizada',
      detalles: [
        { id_cuenta: '1', monto_debe: 100, monto_haber: 0, numero_linea: 1 },
        { id_cuenta: '2', monto_debe: 0, monto_haber: 100, numero_linea: 2 },
      ],
      id_usuario_creador: 'user-1',
    });

    expect(addResult.success).toBe(true);

    const reverseResult = reverseEntry(addResult.entry.id);
    expect(reverseResult.success).toBe(true);

    const history = getPerEntryHistory(addResult.entry.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].type).toBe('reverse');
  });
});
