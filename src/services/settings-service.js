const STORAGE_KEY = '@erp-settings';
const ACTIVE_PERIOD_KEY = '@erp-active-period';
const CONFIGURED_PERIOD_KEY = '@erp-active-period-configured';
const SCHEMA_VERSION = '1.0';

const MODOS = ['month', 'quarter', 'custom', 'year', 'year-previous', 'active'];

function normalizeModo(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (MODOS.includes(raw)) return raw;

  if (raw === 'mes' || raw === 'mensual') return 'month';
  if (raw === 'trimestre' || raw === 'trimestral') return 'quarter';
  if (raw === 'personalizado' || raw === 'rango personalizado' || raw === 'custom-range') return 'custom';
  if (raw === 'anio' || raw === 'año' || raw === 'anual' || raw === 'year-2026') return 'year';
  if (raw === 'anio-anterior' || raw === 'año anterior' || raw === 'year-2025') return 'year-previous';
  return 'custom';
}

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function normalizePeriod(value) {
  if (!value || typeof value !== 'object') return null;
  const source = value.activePeriod && typeof value.activePeriod === 'object' ? value.activePeriod : value;
  const desde = String(source.desde ?? source.from ?? '');
  const hasta = String(source.hasta ?? source.to ?? '');
  if (!isValidIsoDate(desde) || !isValidIsoDate(hasta) || desde > hasta) return null;

  return {
    modo: normalizeModo(source.modo ?? source.preset ?? 'custom'),
    desde,
    hasta,
  };
}

function readJson(key) {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSettings() {
  const settings = readJson(STORAGE_KEY);
  if (!settings) return null;

  if (settings.schemaVersion) return settings;
  return migrateLegacySettings(settings);
}

function migrateLegacySettings(settings) {
  const migrated = {
    schemaVersion: SCHEMA_VERSION,
    activePeriod: normalizePeriod(settings.activePeriod) ||
      normalizePeriod(settings) || {
        from: '',
        to: '',
        preset: 'month',
        modo: 'month',
        desde: '',
        hasta: '',
      },
    defaults: settings.defaults || {},
  };
  saveSettings(migrated);
  return migrated;
}

export function saveSettings(settings) {
  const validated = validateSettings(settings);
  writeJson(STORAGE_KEY, validated);
  return validated;
}

function validateSettings(settings) {
  const result = { schemaVersion: SCHEMA_VERSION };
  const raw = settings?.activePeriod || settings || {};
  const from = String(raw.from ?? raw.desde ?? '');
  const to = String(raw.to ?? raw.hasta ?? '');
  const preset = normalizeModo(raw.preset ?? raw.modo ?? 'month');

  if (!isValidIsoDate(from) || !isValidIsoDate(to) || from > to) {
    const current = loadSettings();
    if (current) return current;
    result.activePeriod = { from: '', to: '', preset: 'month', modo: 'month', desde: '', hasta: '' };
  } else {
    result.activePeriod = { from, to, preset, modo: preset, desde: from, hasta: to };
  }

  if (settings?.defaults) result.defaults = settings.defaults;
  return result;
}

export function setActivePeriod(from, to, preset = 'month') {
  const period = normalizePeriod({ modo: preset, desde: from, hasta: to });
  if (!period) return { success: false, error: 'Rango de fechas inválido' };

  const settings = saveSettings({
    activePeriod: { from: period.desde, to: period.hasta, preset: period.modo },
    schemaVersion: SCHEMA_VERSION,
  });

  return { success: true, settings };
}

export function loadActivePeriod() {
  const keys = [
    ACTIVE_PERIOD_KEY,
    STORAGE_KEY,
    '@erp-periodo-activo',
    'periodo-activo',
    'periodoActivo',
    'activePeriod',
  ];
  for (const key of keys) {
    const period = normalizePeriod(readJson(key));
    if (period) return period;
  }
  return null;
}

export function loadConfiguredPeriod() {
  return (
    normalizePeriod(readJson(CONFIGURED_PERIOD_KEY)) ||
    normalizePeriod(readJson(ACTIVE_PERIOD_KEY)) ||
    loadActivePeriod()
  );
}

export function saveActivePeriod(period, options = {}) {
  const normalized = normalizePeriod(period);
  if (!normalized) return { success: false, error: 'Rango de fechas inválido' };

  const result = setActivePeriod(normalized.desde, normalized.hasta, normalized.modo);
  if (!result.success) return result;

  writeJson(ACTIVE_PERIOD_KEY, normalized);
  if (options.rememberConfigured) writeJson(CONFIGURED_PERIOD_KEY, normalized);

  return { success: true, period: normalized, settings: result.settings };
}

export { ACTIVE_PERIOD_KEY, CONFIGURED_PERIOD_KEY, SCHEMA_VERSION };
