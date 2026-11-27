import { describe, it, expect, beforeEach } from 'vitest';
import { seed500Entries, seedUsers, seedDepartments, seedAccounts } from '../src/utils/seed.js';
import { buildReportData, render } from '../src/views/reportes.js';
import { buildDashboardData } from '../src/views/dashboard.js';
import { saveEntry } from '../src/services/entry-service.js';

describe('US8: Reportes (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    seedUsers();
    seedDepartments();
    seedAccounts();
  });

  it('renders the Estado de Resultados and Flujo de Caja sections', () => {
    saveEntry({
      fecha_contable: '2026-06-01',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-300',
      descripcion: 'Venta integración',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 400, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 400 },
      ],
    });

    const html = render();
    expect(html).toContain('Estado de Resultados');
    expect(html).toContain('Flujo de Caja');
  });

  it('should exclude drafts/pending/approved from both reports', () => {
    ['Borrador', 'Pendiente', 'Aprobada'].forEach((estado, index) => {
      saveEntry({
        fecha_contable: '2026-06-02',
        tipo_documento: 'FACTURA',
        numero_documento: `F-30${index}`,
        descripcion: `Sin contabilizar ${estado}`,
        moneda: 'USD',
        estado,
        id_usuario_creador: 'user-1',
        detalles: [
          { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 10, monto_haber: 0 },
          { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 10 },
        ],
      });
    });

    const data = buildReportData('2026-01-01', '2026-12-31');
    expect(data.statement.ingresos).toBe(0);
    expect(data.cashFlow).toBe(0);
  });

  it('should have zero discrepancy with the dashboard cash-flow figure', () => {
    saveEntry({
      fecha_contable: '2026-06-03',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-310',
      descripcion: 'Cobro',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: 'account-1', monto_debe: 777, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: 'account-2', monto_debe: 0, monto_haber: 777 },
      ],
    });

    const dashboard = buildDashboardData({ from: '2026-01-01', to: '2026-12-31' });
    const report = buildReportData('2026-01-01', '2026-12-31');
    expect(report.cashFlow).toBe(dashboard.metrics.flujoCaja);
  });

  it('should generate both reports within 2 s for 500 posted entries', () => {
    seed500Entries();
    const start = performance.now();
    const data = buildReportData('2020-01-01', '2030-12-31');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
    expect(data.statement.resultadoNeto).toBeDefined();
    expect(data.cashFlow).toBeDefined();
  });
});
