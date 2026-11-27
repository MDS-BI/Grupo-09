import { describe, it, expect, beforeEach } from 'vitest';
import { saveEntry, approveEntry } from '../src/services/entry-service.js';
import { isValidTransition } from '../src/services/approval-service.js';
import { loadCollection } from '../storage.js';
import { seedUsers } from '../src/utils/seed.js';
import { login, logout } from '../src/services/auth-service.js';
import { ENTRY_STATE } from '../src/domain/entry.js';

describe('US5: Flujo de aprobación', () => {
  beforeEach(() => {
    localStorage.clear();
    seedUsers();
  });

  it('should drive the full flow Borrador → Pendiente → Aprobada → Contabilizada, recording approver and date', () => {
    login('user-1'); // admin
    const created = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-020',
      descripcion: 'Prueba flujo aprobación',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: '1', monto_debe: 100, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: '2', monto_debe: 0, monto_haber: 100 },
      ],
    });
    expect(created.success).toBe(true);
    expect(created.entry.estado).toBe(ENTRY_STATE.BORRADOR);

    const submitted = approveEntry(created.entry, null);
    expect(submitted.success).toBe(true);
    expect(submitted.entry.estado).toBe(ENTRY_STATE.PENDIENTE);

    const approved = approveEntry(submitted.entry, 'user-1');
    expect(approved.success).toBe(true);
    expect(approved.entry.estado).toBe(ENTRY_STATE.APROBADA);
    expect(approved.entry.id_usuario_aprobador).toBe('user-1');
    expect(approved.entry.aprobado_en).toBeTruthy();

    const posted = approveEntry(approved.entry, 'user-1');
    expect(posted.success).toBe(true);
    expect(posted.entry.estado).toBe(ENTRY_STATE.CONTABILIZADA);
    logout();
  });

  it('should block an illegal state skip from Borrador directly to Contabilizada', () => {
    expect(isValidTransition(ENTRY_STATE.BORRADOR, ENTRY_STATE.CONTABILIZADA)).toBe(false);

    const created = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-021',
      descripcion: 'Prueba skip ilegal',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: '1', monto_debe: 50, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: '2', monto_debe: 0, monto_haber: 50 },
      ],
    });
    expect(created.success).toBe(true);

    const skipped = approveEntry({ ...created.entry, estado: ENTRY_STATE.CONTABILIZADA });
    expect(skipped.success).toBe(false);
    expect(skipped.error).toBe('Transición no permitida');
  });

  it('should deny approval to a user without permission and leave the state unchanged', () => {
    login('user-3'); // role 'user' (Empleado)
    const created = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-022',
      descripcion: 'Sin permiso',
      moneda: 'USD',
      estado: 'Pendiente',
      id_usuario_creador: 'user-3',
      detalles: [
        { numero_linea: 1, id_cuenta: '1', monto_debe: 40, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: '2', monto_debe: 0, monto_haber: 40 },
      ],
    });
    expect(created.success).toBe(true);

    const denied = approveEntry(created.entry, 'user-3');
    expect(denied.success).toBe(false);
    expect(denied.error).toBe('Usuario sin permiso para aprobar');

    const stored = loadCollection('entries').records.find((item) => item.id === created.entry.id);
    expect(stored.estado).toBe('Pendiente');
    logout();
  });
});
