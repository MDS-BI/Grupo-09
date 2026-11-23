import { loadCollection, SCHEMA_VERSION } from '../storage.js';
import { loadActivePeriod, loadConfiguredPeriod, saveActivePeriod } from '../services/settings-service.js';

export const viewInfo = {
  title: 'Configuración',
  breadcrumb: 'Configuración',
  description: 'Administra las preferencias del período contable y las finanzas.',
  action: 'Guardar cambios',
};

let listenersBound = false;

export function render() {
  ensureListeners();

  const activePeriod = loadConfiguredPeriod() || loadActivePeriod() || {};
  const preset = normalizePreset(activePeriod.modo);
  const from = isValidDate(activePeriod.desde) ? activePeriod.desde : '';
  const to = isValidDate(activePeriod.hasta) ? activePeriod.hasta : '';
  const warning = getSchemaWarning();

  return `
    <section class="settings-view">
      <div class="panel-heading">
        <div>
          <h2>Configuración del período contable</h2>
          <p>Define el período activo y verifica el respaldo local del módulo.</p>
        </div>
      </div>

      <div class="schema-warning" id="schema-warning"${warning ? '' : ' hidden'}>${escapeHtml(warning)}</div>

      <div class="panel" style="padding: 16px; margin: 14px 0">
        <h3 style="margin: 0 0 12px; font: 700 13px Manrope, sans-serif; color: #263244">
          Período contable activo por defecto
        </h3>
        <div class="period-selector" style="display: grid; gap: 8px; max-width: 420px">
          ${renderPresetButton('month', 'Mes', preset)}
          ${renderPresetButton('quarter', 'Trimestre', preset)}
          ${renderPresetButton('custom', 'Rango personalizado', preset)}
        </div>
        <div
          class="custom-period-fields"
          id="custom-period-fields"
          style="display: flex; align-items: flex-end; gap: 12px; margin-top: 14px"
          ${preset === 'custom' ? '' : 'hidden'}
        >
          <label style="display: grid; gap: 4px; font-size: 10px; color: #697689">
            Desde
            <input class="date-input" type="date" id="settings-from" value="${escapeHtml(from)}" />
          </label>
          <label style="display: grid; gap: 4px; font-size: 10px; color: #697689">
            Hasta
            <input class="date-input" type="date" id="settings-to" value="${escapeHtml(to)}" />
          </label>
        </div>
        <p
          class="period-feedback"
          id="period-feedback"
          role="alert"
          style="margin: 12px 0 0; font-size: 11px; color: #21875f"
          hidden
        ></p>
        <div style="display: flex; gap: 8px; margin-top: 16px">
          <button class="button button-primary" id="save-period" type="button">Guardar período</button>
          <button class="button button-secondary" id="reset-period" type="button">Restablecer</button>
        </div>
      </div>

      <div class="panel" style="padding: 16px">
        <div class="panel-heading">
          <div>
            <h2>Estado del almacenamiento local</h2>
            <p>Versión del esquema y recuentos verificados al cargar.</p>
          </div>
        </div>
        <div id="storage-status">${renderStorageStatus()}</div>
      </div>
    </section>
  `;
}

function renderPresetButton(value, label, selectedPreset) {
  const selected = value === selectedPreset;
  return `
    <button
      class="button ${selected ? 'button-primary' : 'button-secondary'} period-preset-button"
      type="button"
      data-period-preset="${value}"
      aria-pressed="${selected}"
    >
      ${label}
    </button>
  `;
}

function renderStorageStatus() {
  const status = readStorageStatus();
  return `
    <div class="status-panel" style="display: grid; gap: 8px; margin-top: 14px; max-width: 420px">
      <div class="status-item" style="display: flex; justify-content: space-between; font-size: 11px">
        <span>Versión de esquema</span><strong>${escapeHtml(status.schemaVersion)}</strong>
      </div>
      <div class="status-item" style="display: flex; justify-content: space-between; font-size: 11px">
        <span>Cuentas</span><strong>${status.accounts}</strong>
      </div>
      <div class="status-item" style="display: flex; justify-content: space-between; font-size: 11px">
        <span>Asientos</span><strong>${status.entries}</strong>
      </div>
      <div class="status-item" style="display: flex; justify-content: space-between; font-size: 11px">
        <span>Eventos de auditoría</span><strong>${status.events}</strong>
      </div>
    </div>
  `;
}

function readStorageStatus() {
  const accounts = loadCollection('accounts');
  const entries = loadCollection('entries');
  const events = loadCollection('audit-log');
  return {
    schemaVersion: SCHEMA_VERSION,
    accounts: accounts.records.length,
    entries: entries.records.length,
    events: events.records.length,
  };
}

function getSchemaWarning() {
  const keys = ['@erp-settings', '@erp-envelope:accounts', '@erp-envelope:entries', '@erp-envelope:audit-log'];
  const mismatches = [];

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.schemaVersion && parsed.schemaVersion !== SCHEMA_VERSION) {
        mismatches.push(`${key} (${parsed.schemaVersion})`);
      }
    } catch {
      mismatches.push(`${key} (ilegible)`);
    }
  }

  if (!mismatches.length) return '';
  return `Se detectaron versiones de esquema incompatibles: ${mismatches.join(
    ', ',
  )}. Los datos se conservaron y se migraron a la versión ${SCHEMA_VERSION}.`;
}

function ensureListeners() {
  if (listenersBound || typeof document === 'undefined') return;
  listenersBound = true;
  document.addEventListener('click', handleSettingsClick);
  document.addEventListener('input', handleSettingsInput);
}

function handleSettingsInput(event) {
  const input = event.target.closest?.('#settings-from, #settings-to');
  if (!input) return;
  const view = input.closest('.settings-view');
  if (!view) return;
  selectPreset(view, 'custom');
}

function handleSettingsClick(event) {
  const settingsView = event.target.closest?.('.settings-view');
  if (!settingsView) return;

  const presetButton = event.target.closest?.('[data-period-preset]');
  if (presetButton) {
    selectPreset(settingsView, presetButton.dataset.periodPreset);
    return;
  }

  if (event.target.closest?.('#save-period')) {
    saveCurrentPeriod(settingsView);
    return;
  }

  if (event.target.closest?.('#reset-period')) {
    resetPeriod(settingsView);
  }
}

function selectPreset(view, value) {
  const preset = normalizePreset(value);
  view.querySelectorAll('[data-period-preset]').forEach((button) => {
    const selected = button.dataset.periodPreset === preset;
    button.classList.toggle('button-primary', selected);
    button.classList.toggle('button-secondary', !selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  const fields = view.querySelector('#custom-period-fields');
  if (fields) fields.hidden = preset !== 'custom';

  if (preset !== 'custom') {
    const range = presetRange(preset);
    const fromInput = view.querySelector('#settings-from');
    const toInput = view.querySelector('#settings-to');
    if (fromInput) fromInput.value = range.from;
    if (toInput) toInput.value = range.to;
  }

  setFeedback(view, '', false);
}

function saveCurrentPeriod(view) {
  const preset = view.querySelector('[data-period-preset].button-primary')?.dataset.periodPreset || 'month';
  let from;
  let to;

  if (preset === 'custom') {
    from = view.querySelector('#settings-from')?.value || '';
    to = view.querySelector('#settings-to')?.value || '';
    if (!isValidDate(from) || !isValidDate(to)) {
      setFeedback(view, 'Selecciona fechas válidas para el rango personalizado.', true);
      return;
    }
  } else {
    ({ from, to } = presetRange(preset));
  }

  if (from > to) {
    setFeedback(view, 'La fecha inicial no puede ser posterior a la fecha final.', true);
    return;
  }

  const result = saveActivePeriod({ modo: preset, desde: from, hasta: to }, { rememberConfigured: true });
  if (!result.success) {
    setFeedback(view, result.error || 'No se pudo guardar el período.', true);
    return;
  }

  const savedPeriod = loadConfiguredPeriod();
  const activePeriod = loadActivePeriod();
  const verified =
    savedPeriod?.modo === preset &&
    savedPeriod.desde === from &&
    savedPeriod.hasta === to &&
    activePeriod?.desde === from &&
    activePeriod?.hasta === to;

  if (!verified) {
    setFeedback(view, 'No se pudo verificar la persistencia del período.', true);
    return;
  }

  updateStoragePanel(view);
  setFeedback(view, 'Período guardado y verificado correctamente.', false);
  showToast('Período guardado correctamente');
}

function resetPeriod(view) {
  const range = presetRange('month');
  const result = saveActivePeriod({ modo: 'month', desde: range.from, hasta: range.to }, { rememberConfigured: true });
  if (!result.success) {
    setFeedback(view, result.error || 'No se pudo restablecer el período.', true);
    return;
  }

  selectPreset(view, 'month');
  const fromInput = view.querySelector('#settings-from');
  const toInput = view.querySelector('#settings-to');
  if (fromInput) fromInput.value = range.from;
  if (toInput) toInput.value = range.to;

  updateStoragePanel(view);
  setFeedback(view, 'Período restablecido al mes activo.', false);
  showToast('Período restablecido');
}

function updateStoragePanel(view) {
  const statusPanel = view.querySelector('#storage-status');
  if (statusPanel) statusPanel.innerHTML = renderStorageStatus();

  const warningPanel = view.querySelector('#schema-warning');
  const warning = getSchemaWarning();
  if (warningPanel) {
    warningPanel.textContent = warning;
    warningPanel.hidden = !warning;
  }
}

function setFeedback(view, message, isError) {
  const feedback = view.querySelector('#period-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = !message;
  feedback.style.color = isError ? '#c76854' : '#21875f';
}

function presetRange(preset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === 'quarter') {
    const firstMonth = Math.floor(month / 3) * 3;
    const endMonthIndex = firstMonth + 2;
    return {
      from: `${year}-${String(firstMonth + 1).padStart(2, '0')}-01`,
      to: `${year}-${String(endMonthIndex + 1).padStart(2, '0')}-${String(
        new Date(year, endMonthIndex + 1, 0).getDate(),
      ).padStart(2, '0')}`,
    };
  }

  return {
    from: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    to: `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(
      2,
      '0',
    )}`,
  };
}

function normalizePreset(value) {
  if (['month', 'quarter', 'custom'].includes(value)) return value;
  return value ? 'custom' : 'month';
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}

export default render;
