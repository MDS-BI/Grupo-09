import { describe, it, expect, beforeEach } from 'vitest';
import { seedUsers, seedDepartments, seedAccounts } from '../src/utils/seed.js';
import { computeTotalsByDepartment, loadDepartmentCatalog } from '../src/views/centros-costo.js';
import { filterEntries } from '../src/services/query-service.js';
import { saveEntry } from '../src/services/entry-service.js';
import { addDepartment } from '../src/domain/shared.js';
import { ENTRY_STATE } from '../src/domain/entry.js';

function totalsFor(from, to) {
  const posted = filterEntries({ fecha_desde: from, fecha_hasta: to, estado: ENTRY_STATE.CONTABILIZADA });
  return computeTotalsByDepartment(posted, loadDepartmentCatalog());
}

describe('US7: Centros de costo (real src/views/centros-costo.js)', () => {
  beforeEach(() => {
    localStorage.clear();
    seedUsers();
    seedDepartments();
    seedAccounts();
  });

  it('should group totals by department for posted entries', () => {
    saveEntry({
      fecha_contable: '2026-05-10',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-200',
      descripcion: 'Venta dept-1',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-2', id_departamento: 'dept-1', monto_debe: 0, monto_haber: 1000 },
        { numero_linea: 2, id_cuenta: 'account-1', monto_debe: 1000, monto_haber: 0 },
      ],
    });

    const result = totalsFor('2026-01-01', '2026-12-31');
    expect(result['dept-1']).toEqual({ ingresos: 1000, gastos: 0, saldoNeto: 1000 });
  });

  it('should return zero totals for a department without movements', () => {
    addDepartment({
      id: 'dept-zero',
      nombre: 'Depto Vacío',
      codigo: 'VAC',
      acepta_movimientos: true,
      es_efectivo: false,
      creado_por: 'user-1',
    });
    const result = totalsFor('2026-01-01', '2026-12-31');
    expect(result['dept-zero']).toEqual({ ingresos: 0, gastos: 0, saldoNeto: 0 });
  });

  it('should bucket lines without a department under "Sin departamento"', () => {
    saveEntry({
      fecha_contable: '2026-05-11',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-201',
      descripcion: 'Sin depto',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-3', monto_debe: 300, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-1', monto_debe: 0, monto_haber: 300 },
      ],
    });

    const result = totalsFor('2026-01-01', '2026-12-31');
    expect(result['Sin departamento'].gastos).toBe(300);
  });

  it('should exclude Borrador/Pendiente/Aprobada entries from department totals', () => {
    saveEntry({
      fecha_contable: '2026-05-12',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-202',
      descripcion: 'Borrador',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-2', id_departamento: 'dept-1', monto_debe: 0, monto_haber: 5000 },
        { numero_linea: 2, id_cuenta: 'account-1', monto_debe: 5000, monto_haber: 0 },
      ],
    });

    const result = totalsFor('2026-01-01', '2026-12-31');
    expect(result['dept-1'].ingresos).toBe(0);
  });

  it('should maintain 4-decimal precision in saldoNeto', () => {
    saveEntry({
      fecha_contable: '2026-05-13',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-203',
      descripcion: 'Decimales',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-2', id_departamento: 'dept-1', monto_debe: 0, monto_haber: 100.1234 },
        { numero_linea: 2, id_cuenta: 'account-1', monto_debe: 100.1234, monto_haber: 0 },
      ],
    });

    const result = totalsFor('2026-01-01', '2026-12-31');
    expect(result['dept-1'].saldoNeto).toBe(100.1234);
  });
});
