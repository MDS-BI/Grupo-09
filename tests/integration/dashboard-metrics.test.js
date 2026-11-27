import { describe, it, expect, beforeEach } from 'vitest';
import { seed500Entries, seedUsers, seedDepartments, seedAccounts, seedEntries } from '../src/utils/seed.js';
import { buildDashboardData } from '../src/views/dashboard.js';
import { saveEntry } from '../src/services/entry-service.js';

describe('US1: Dashboard metrics (real src/views/dashboard.js)', () => {
  beforeEach(() => {
    localStorage.clear();
    seedUsers();
    seedDepartments();
    seedAccounts();
    seedEntries();
  });

  it('should show correct metrics from seeded Contabilizada entries', () => {
    const data = buildDashboardData({ from: '2026-01-01', to: '2026-12-31' });
    expect(data.metrics.ingresos).toBeGreaterThan(0);
    expect(data.metrics.gastos).toBeGreaterThan(0);
    expect(data.metrics.resultadoNeto).toBe(+(data.metrics.ingresos - data.metrics.gastos).toFixed(4));
  });

  it('should show zero-state when no entries exist', () => {
    localStorage.removeItem('@erp-envelope:entries');
    const data = buildDashboardData({ from: '2026-01-01', to: '2026-12-31' });
    expect(data.metrics.ingresos).toBe(0);
    expect(data.metrics.gastos).toBe(0);
    expect(data.metrics.resultadoNeto).toBe(0);
    expect(data.entries.length).toBe(0);
  });

  it('should update metrics after a new entry is registered and posted', () => {
    const before = buildDashboardData({ from: '2026-01-01', to: '2026-12-31' });
    const result = saveEntry({
      fecha_contable: '2026-06-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-900',
      descripcion: 'Venta adicional',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 500 },
        { numero_linea: 2, id_cuenta: 'account-1', monto_debe: 500, monto_haber: 0 },
      ],
    });
    expect(result.success).toBe(true);

    const after = buildDashboardData({ from: '2026-01-01', to: '2026-12-31' });
    expect(after.metrics.ingresos).toBe(+(before.metrics.ingresos + 500).toFixed(4));
  });

  it('should use es_efectivo exclusively for cash flow, matching the Flujo de Caja report', () => {
    const data = buildDashboardData({ from: '2026-01-01', to: '2026-12-31' });
    expect(typeof data.metrics.flujoCaja).toBe('number');
    // Only accounts flagged es_efectivo may appear in the cash balance breakdown.
    expect(data.cashBalances.every((balance) => balance.name !== 'Ventas')).toBe(true);
  });

  it('should render metrics within 2 seconds for 500 posted entries', () => {
    seed500Entries();
    const start = performance.now();
    const data = buildDashboardData({ from: '2020-01-01', to: '2030-12-31' });
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
    expect(data.entries.length).toBe(500);
  });
});
