import { describe, it, expect, beforeEach } from 'vitest';
import { seedUsers, seedDepartments, seedAccounts } from '../src/utils/seed.js';
import { buildReportData } from '../src/views/reportes.js';
import { saveEntry } from '../src/services/entry-service.js';

describe('US8: Reportes (real src/views/reportes.js)', () => {
  beforeEach(() => {
    localStorage.clear();
    seedUsers();
    seedDepartments();
    seedAccounts();
  });

  it('should build income statement grouping ingresos/gastos by account type', () => {
    saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-050',
      descripcion: 'Venta',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 100, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 100 },
      ],
    });

    const data = buildReportData('2026-01-01', '2026-12-31');
    expect(data.statement.ingresos).toBe(100);
    expect(data.statement.gastos).toBe(0);
    expect(data.statement.resultadoNeto).toBe(100);
  });

  it('should calculate net result with 4-decimal precision', () => {
    saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-050b',
      descripcion: 'Venta con decimales',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 100.1234, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 100.1234 },
      ],
    });

    const data = buildReportData('2026-01-01', '2026-12-31');
    expect(data.statement.resultadoNeto).toBe(100.1234);
  });

  it('should calculate cash-flow totals strictly from es_efectivo', () => {
    saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-051',
      descripcion: 'Cobro en efectivo',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 250, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 250 },
      ],
    });

    const data = buildReportData('2026-01-01', '2026-12-31');
    expect(data.cashFlow).toBe(250);
    expect(data.cashRows.every((row) => row.id === 'account-1')).toBe(true);
  });

  it('should exclude non-Contabilizada entries from both reports', () => {
    saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-052',
      descripcion: 'Borrador',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 999, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 999 },
      ],
    });

    const data = buildReportData('2026-01-01', '2026-12-31');
    expect(data.statement.ingresos).toBe(0);
    expect(data.cashFlow).toBe(0);
  });

  it('should handle an empty period with zero totals', () => {
    const data = buildReportData('2025-01-01', '2025-12-31');
    expect(data.statement.ingresos).toBe(0);
    expect(data.statement.gastos).toBe(0);
    expect(data.statement.resultadoNeto).toBe(0);
    expect(data.cashFlow).toBe(0);
  });
});
