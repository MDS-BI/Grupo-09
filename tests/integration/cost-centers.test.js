import { describe, it, expect, beforeEach } from 'vitest';
import { seed500Entries, seedUsers, seedDepartments, seedAccounts } from '../src/utils/seed.js';
import { computeTotalsByDepartment, loadDepartmentCatalog, render } from '../src/views/centros-costo.js';
import { filterEntries } from '../src/services/query-service.js';
import { ENTRY_STATE } from '../src/domain/entry.js';

function totalsFor(from, to) {
  const posted = filterEntries({ fecha_desde: from, fecha_hasta: to, estado: ENTRY_STATE.CONTABILIZADA });
  return computeTotalsByDepartment(posted, loadDepartmentCatalog());
}

describe('US7: Centros de costo (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    seedUsers();
    seedDepartments();
    seedAccounts();
  });

  it('renders the "Totales por departamento" section', () => {
    const html = render();
    expect(html).toContain('Totales por departamento');
    expect(html).toContain('Sin departamento');
  });

  it('should show totals per department from 500 seeded posted entries', () => {
    seed500Entries();
    const result = totalsFor('2020-01-01', '2030-12-31');
    expect(Object.keys(result).length).toBeGreaterThan(0);
    expect(result['Sin departamento']).toBeDefined();
  });

  it('should render totals within 2 s for 500 posted entries across departments', () => {
    seed500Entries();
    const start = performance.now();
    const result = totalsFor('2020-01-01', '2030-12-31');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
});
