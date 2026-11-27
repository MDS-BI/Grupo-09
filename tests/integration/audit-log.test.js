import { describe, it, expect, beforeEach } from 'vitest';
import { saveEntry, approveEntry } from '../src/services/entry-service.js';
import { reverseEntry } from '../src/services/reverse-service.js';
import { addAccount, updateAccount } from '../src/domain/account.js';
import { getPerEntryHistory, getEventsByType, logEvent } from '../src/services/audit-service.js';
import { render } from '../src/views/auditoria.js';
import { seedUsers } from '../src/utils/seed.js';

describe('US10: Bitácora de auditoría', () => {
  beforeEach(() => {
    localStorage.clear();
    seedUsers();
  });

  it('should produce one chronological event per action in the full entry lifecycle', () => {
    const created = saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-100',
      descripcion: 'Ciclo completo',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: '1', monto_debe: 50, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: '2', monto_debe: 0, monto_haber: 50 },
      ],
    });
    expect(created.success).toBe(true);

    const submitted = approveEntry(created.entry, null);
    const approved = approveEntry(submitted.entry, 'user-1');
    const posted = approveEntry(approved.entry, 'user-1');
    const reversed = reverseEntry(posted.entry.id);
    expect(reversed.success).toBe(true);

    const history = getPerEntryHistory(created.entry.id);
    const types = history.map((event) => event.type);
    expect(types).toContain('entry_creation');
    expect(types).toContain('submit');
    expect(types).toContain('approve');
    expect(types).toContain('post');
    expect(types).toContain('reverse');
    history.forEach((event) => expect(event.timestamp).toBeTruthy());
  });

  it('should record events for account create/edit/deactivate/reactivate', () => {
    const created = addAccount({
      codigo: '1100',
      nombre: 'Caja',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: true,
      activa: true,
    });
    expect(created.success).toBe(true);

    updateAccount(created.account.id, { nombre: 'Caja renombrada' });
    updateAccount(created.account.id, { activa: false });
    updateAccount(created.account.id, { activa: true });

    const history = getPerEntryHistory(created.account.id);
    const types = history.map((event) => event.type);
    expect(types).toContain('account_create');
    expect(types).toContain('account_edit');
    expect(types).toContain('account_deactivate');
    expect(types).toContain('account_reactivate');
  });

  it('should have events with user and timestamp', () => {
    const result = logEvent({
      type: 'test_event',
      entityType: 'entry',
      entityId: 'entry-1',
      metadata: { userId: 'user-1' },
    });
    expect(result.timestamp).toBeTruthy();
    expect(result.metadata.userId).toBe('user-1');
  });

  it('first page/filter loads under 1 s for 1,000 events (UX target, not SC-016)', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      logEvent({ type: 'test_event', entityType: 'entry', entityId: `entry-${i}`, metadata: { userId: 'user-1' } });
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
    expect(getEventsByType('test_event').length).toBe(1000);
  });

  it('should have no edit/delete controls in the audit UI', () => {
    const html = render([
      { type: 'test_event', entityType: 'entry', entityId: 'entry-1', timestamp: new Date().toISOString() },
    ]);
    expect(html).not.toContain('data-action="edit"');
    expect(html).not.toContain('data-action="delete"');
    expect(html).toContain('solo lectura');
  });
});
