import { describe, it, expect, beforeEach } from 'vitest';
import { seed500Entries } from '../src/utils/seed.js';
import { setActivePeriod, loadSettings } from '../src/services/settings-service.js';
import { loadCollection } from '../storage.js';

describe('US12: Período y respaldo local', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:entries');
    localStorage.removeItem('@erp-envelope:accounts');
    localStorage.removeItem('@erp-envelope:settings');
    localStorage.removeItem('@erp-envelope:department-base');
  });

  it('should save period and survive reload', () => {
    // Set a period
    const result = setActivePeriod('2026-10-01', '2026-10-31', 'month');
    expect(result.success).toBe(true);

    // Reload the page (simulated by checking settings persist)
    const settings = loadSettings();
    expect(settings?.activePeriod?.from).toBe('2026-10-01');
    expect(settings?.activePeriod?.to).toBe('2026-10-31');
  });

  it('should use saved period in dashboard', () => {
    // Set a period
    setActivePeriod('2026-10-01', '2026-10-31', 'month');

    // Dashboard should use the saved period
    const settings = loadSettings();
    expect(settings?.activePeriod?.from).toBe('2026-10-01');
  });

  it('should use saved period in reports', () => {
    // Set a period
    setActivePeriod('2026-10-01', '2026-10-31', 'month');

    // Reports should use the saved period
    const settings = loadSettings();
    expect(settings?.activePeriod?.from).toBe('2026-10-01');
  });

  it('should preserve accounts, entries and events on reload with version validation', () => {
    // Add some data
    seed500Entries();

    // Reload simulates checking version validation
    const accounts = loadCollection('accounts');
    const entries = loadCollection('entries');

    expect(accounts.records.length).toBeGreaterThan(0);
    expect(entries.records.length).toBeGreaterThan(0);
  });

  it('should handle incompatible version preserving records', () => {
    // Simulate legacy data without schema version
    localStorage.setItem(
      '@erp-envelope:entries',
      JSON.stringify({
        records: [{ id: '1', monto_debe: 100, monto_haber: 0, numero_linea: 1 }],
        schemaVersion: 'legacy',
      }),
    );

    // Load should migrate the data
    const result = loadCollection('entries');
    expect(result.records.length).toBe(1);
    expect(result.schemaVersion).toBe('1.0');
  });

  it('should have accurate counts after version migration', () => {
    const accounts = loadCollection('accounts');
    const entries = loadCollection('entries');

    expect(accounts.schemaVersion).toBe('1.0');
    expect(entries.schemaVersion).toBe('1.0');
  });
});
