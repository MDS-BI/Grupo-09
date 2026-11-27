import { loadCollection } from '../storage.js';
import { ENTRY_STATE } from '../domain/entry.js';
import { filterEntries } from '../services/query-service.js';
import { loadSettings } from '../services/settings-service.js';

export const viewInfo = {
  title: 'Centros de costo',
  breadcrumb: 'Centros de costo',
  description: 'Controla presupuestos y analiza gastos por departamento.',
  action: 'Aplicar período',
};

const SIN_DEPARTAMENTO = 'Sin departamento';
const state = { preset: 'active', from: '', to: '' };
let listenersBound = false;

export function render() {
  bindListeners();
  const period = resolveActivePeriod(loadSettings());
  state.preset = 'active';
  state.from = period.from;
  state.to = period.to;

  return `
    <section class="centros-costo-view" id="centros-costo-view" aria-label="Centros de costo">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-line"></span> CONTROL POR DEPARTAMENTOS</div>
          <h1>Centros de costo</h1>
          <p class="subtitle">Ingresos, gastos y saldo neto acumulados por departamento del catálogo ERP.</p>
        </div>
        <div class="heading-actions">
          <span class="period-label"
            ><span class="status-dot"></span>Período:
            <strong id="cc-period-label">${escapeHtml(`${formatDate(state.from)} — ${formatDate(state.to)}`)}</strong></span
          >
        </div>
      </div>

      <div class="period-toolbar">
        <div class="period-tabs" role="tablist" aria-label="Período contable">
          ${renderPresetTabs()}
        </div>
        <div class="table-actions">
          <label class="table-search" style="font-size: 10px"
            >Desde <input type="date" id="cc-from" value="${escapeHtml(state.from)}" aria-label="Fecha inicial del período"
          /></label>
          <label class="table-search" style="font-size: 10px"
            >Hasta <input type="date" id="cc-to" value="${escapeHtml(state.to)}" aria-label="Fecha final del período"
          /></label>
          <button class="button button-primary button-compact" type="button" data-action="cc-apply">Aplicar</button>
        </div>
      </div>

      <div
        id="cc-feedback"
        role="alert"
        style="margin-bottom: 12px; padding: 10px 14px; border-left: 3px solid #c76854; background: #fff7f5; font-size: 11px; color: #c76854"
        hidden
      ></div>

      <div id="cc-results">${renderResults()}</div>
    </section>
  `;
}

export default render;

function bindListeners() {
  if (listenersBound || typeof document === 'undefined') return;
  listenersBound = true;

  document.addEventListener('click', (event) => {
    const root = event.target.closest?.('#centros-costo-view');
    if (!root) return;

    const presetButton = event.target.closest?.('[data-period]');
    if (presetButton) {
      applyPreset(presetButton.dataset.period);
      return;
    }

    if (event.target.closest?.('[data-action="cc-apply"]')) generate();
  });

  document.addEventListener('change', (event) => {
    if (!event.target.closest?.('#centros-costo-view')) return;
    if (event.target.matches('#cc-from, #cc-to')) generate();
  });

  document.addEventListener('finance:data-changed', () => updateResults());
  window.addEventListener('storage', (event) => {
    if (!event.key || event.key.startsWith('@erp-envelope:entries') || event.key.startsWith('@erp-department-base')) {
      updateResults();
    }
  });
}

function generate() {
  const root = document.querySelector('#centros-costo-view');
  if (!root) return;
  const from = root.querySelector('#cc-from')?.value || '';
  const to = root.querySelector('#cc-to')?.value || '';

  if (!isValidDate(from) || !isValidDate(to)) {
    setFeedback('Selecciona una fecha inicial y una fecha final válidas.');
    return;
  }
  if (from > to) {
    setFeedback('La fecha inicial no puede ser posterior a la fecha final. Se conservan los totales anteriores.');
    return;
  }

  state.from = from;
  state.to = to;
  state.preset = detectPreset(from, to);
  clearFeedback();
  syncToolbar();
  updateResults();
}

function applyPreset(value) {
  const preset = ['active', 'month', 'quarter', 'year'].includes(value) ? value : 'active';
  const range = preset === 'active' ? resolveActivePeriod(loadSettings()) : rangeOf(preset);
  state.preset = preset;
  state.from = range.from;
  state.to = range.to;
  clearFeedback();
  syncToolbar();
  updateResults();
}

function syncToolbar() {
  const root = document.querySelector('#centros-costo-view');
  if (!root) return;
  root.querySelectorAll('[data-period]').forEach((button) => {
    const selected = button.dataset.period === state.preset;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  const fromInput = root.querySelector('#cc-from');
  const toInput = root.querySelector('#cc-to');
  if (fromInput) fromInput.value = state.from;
  if (toInput) toInput.value = state.to;
  const label = root.querySelector('#cc-period-label');
  if (label) label.textContent = `${formatDate(state.from)} — ${formatDate(state.to)}`;
}

function setFeedback(message) {
  const feedback = document.querySelector('#centros-costo-view #cc-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = !message;
}

function clearFeedback() {
  setFeedback('');
}

function updateResults() {
  const container = document.querySelector('#centros-costo-view #cc-results');
  if (!container) return;
  container.innerHTML = renderResults();
  syncToolbar();
}

function renderPresetTabs() {
  const presets = [
    ['active', 'Período activo'],
    ['month', 'Mes'],
    ['quarter', 'Trimestre'],
    ['year', 'Año'],
  ];
  return presets
    .map(([value, label]) => {
      const selected = state.preset === value;
      return `<button class="period-tab${selected ? ' selected' : ''}" type="button" role="tab" aria-selected="${selected}" data-period="${value}">${label}</button>`;
    })
    .join('');
}

function renderResults() {
  const catalog = loadDepartmentCatalog();
  const posted = filterEntries({
    fecha_desde: state.from,
    fecha_hasta: state.to,
    estado: ENTRY_STATE.CONTABILIZADA,
  });
  const totals = computeTotalsByDepartment(posted, catalog);
  const rows = buildRows(catalog, totals);

  const summary = rows.reduce(
    (accumulator, row) => {
      accumulator.ingresos += row.ingresos;
      accumulator.gastos += row.gastos;
      accumulator.saldoNeto += row.saldoNeto;
      return accumulator;
    },
    { ingresos: 0, gastos: 0, saldoNeto: 0 },
  );
  summary.ingresos = round4(summary.ingresos);
  summary.gastos = round4(summary.gastos);
  summary.saldoNeto = round4(summary.saldoNeto);

  return `
    <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))">
      ${renderMetricCard('Ingresos acumulados', 'cc-metric-ingresos', formatCurrency(summary.ingresos), 'icon-green', '<path d="M4 16 10 10l4 4 6-7M14 7h6v6" />', 'Asientos contabilizados')}
      ${renderMetricCard('Gastos acumulados', 'cc-metric-gastos', formatCurrency(summary.gastos), 'icon-amber', '<path d="M4 8 10 14l4-4 6 7M14 17h6v-6" />', 'Asientos contabilizados')}
      ${renderMetricCard('Saldo neto', 'cc-metric-saldo', formatCurrency(summary.saldoNeto), 'icon-blue', '<path d="M4 19V5m0 14h16M8 15l4-5 3 2 5-7" />', 'Ingresos menos gastos')}
      ${renderMetricCard('Asientos contabilizados', 'cc-metric-asientos', String(posted.length), 'icon-violet', '<path d="M4 5h16M4 12h16M4 19h16" />', 'Estado Contabilizada')}
    </div>

    ${
      posted.length === 0
        ? `<div class="panel" style="margin-bottom: 14px; padding: 12px 17px; border-left: 3px solid #d89842; background: #fffaf3; font-size: 11px; color: #b67a2d">
            No hay asientos contabilizados en el período seleccionado: los departamentos se muestran con saldos en $0.00.
          </div>`
        : ''
    }

    ${
      catalog.length === 0
        ? `<div class="panel" style="margin-bottom: 14px; padding: 12px 17px; border-left: 3px solid #d89842; background: #fffaf3; font-size: 11px; color: #b67a2d">
            No hay departamentos en el catálogo ERP: se muestra únicamente la categoría «${SIN_DEPARTAMENTO}».
          </div>`
        : ''
    }

    <section class="panel transactions-panel">
      <div class="panel-heading transactions-heading">
        <div>
          <h2>Totales por departamento</h2>
          <p>
            Período ${escapeHtml(formatDate(state.from))} — ${escapeHtml(formatDate(state.to))} · solo asientos
            Contabilizada y cuentas de tipo Ingreso o Gasto
          </p>
        </div>
        <div class="table-actions">
          <span class="period-label">${catalog.length} departamentos en catálogo</span>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>DEPARTAMENTO</th>
              <th>CÓDIGO</th>
              <th class="amount-col">INGRESOS ACUMULADOS</th>
              <th class="amount-col">GASTOS ACUMULADOS</th>
              <th class="amount-col">SALDO NETO</th>
            </tr>
          </thead>
          <tbody>${rows.map(renderRow).join('')}</tbody>
          <tfoot>
            <tr>
              <th colspan="2">Totales del período</th>
              <th class="amount-col">${escapeHtml(formatCurrency(summary.ingresos))}</th>
              <th class="amount-col">${escapeHtml(formatCurrency(summary.gastos))}</th>
              <th class="amount-col">${escapeHtml(formatCurrency(summary.saldoNeto))}</th>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="table-footer">
        <span
          >Solo se imputan cuentas de tipo Ingreso o Gasto (se ignoran Activo, Pasivo y Patrimonio): los totales por
          departamento más la categoría «${SIN_DEPARTAMENTO}» concilian con los totales del período.</span
        >
        <span class="period-label">Departamentos sin movimientos: $0.00</span>
      </div>
    </section>
  `;
}

export function loadDepartmentCatalog() {
  const records = [...loadCollection('@erp-department-base').records, ...loadCollection('centros-costo').records];
  const byId = new Map();
  records.filter(Boolean).forEach((record) => {
    const id = record.id || record._id;
    if (!id || byId.has(id)) return;
    byId.set(id, { ...record, id });
  });
  return [...byId.values()];
}

export function computeTotalsByDepartment(posted, catalog) {
  const accountsById = new Map(
    loadCollection('accounts')
      .records.filter(Boolean)
      .map((account) => [account.id, account]),
  );
  const totals = {};
  const ensureBucket = (key) => {
    if (!totals[key]) totals[key] = { ingresos: 0, gastos: 0, saldoNeto: 0 };
    return totals[key];
  };

  ensureBucket(SIN_DEPARTAMENTO);
  catalog.forEach((department) => ensureBucket(department.id || department._id));

  for (const entry of posted) {
    for (const line of entry.detalles || []) {
      const account = accountsById.get(line.id_cuenta);
      if (!account) continue;
      const kind = accountKind(account);
      if (!kind) continue;

      const bucket = ensureBucket(line.id_departamento || SIN_DEPARTAMENTO);
      const debe = Number(line.monto_debe) || 0;
      const haber = Number(line.monto_haber) || 0;
      if (kind === 'ingreso') bucket.ingresos += haber - debe;
      else bucket.gastos += debe - haber;
    }
  }

  Object.values(totals).forEach((bucket) => {
    bucket.ingresos = round4(bucket.ingresos);
    bucket.gastos = round4(bucket.gastos);
    bucket.saldoNeto = round4(bucket.ingresos - bucket.gastos);
  });

  return totals;
}

function accountKind(account) {
  const tipo = String(account?.tipo || '')
    .trim()
    .toLowerCase();
  if (tipo === 'ingreso') return 'ingreso';
  if (tipo === 'gasto' || tipo === 'egreso') return 'gasto';
  return null;
}

function buildRows(catalog, totals) {
  const rows = [];
  const used = new Set();
  const consolidated = { ingresos: 0, gastos: 0 };

  const absorb = (value) => {
    if (!value) return;
    consolidated.ingresos += round4(Number(value.ingresos) || 0);
    consolidated.gastos += round4(Number(value.gastos) || 0);
  };

  catalog.forEach((department) => {
    const id = department.id || department._id;
    if (!id || used.has(id)) return;
    used.add(id);
    if (isSinDepartamento(department)) {
      absorb(totals[id]);
      return;
    }
    rows.push(makeRow(id, department.codigo, department.nombre, totals[id]));
  });

  Object.entries(totals).forEach(([key, value]) => {
    if (key === SIN_DEPARTAMENTO || used.has(key)) return;
    used.add(key);
    rows.push(makeRow(key, '', key, value));
  });

  absorb(totals[SIN_DEPARTAMENTO]);
  rows.push(
    makeRow(
      SIN_DEPARTAMENTO,
      'SIN',
      SIN_DEPARTAMENTO,
      { ingresos: consolidated.ingresos, gastos: consolidated.gastos },
      'Dept. SIN y líneas sin centro de costo',
    ),
  );

  return rows;
}

function isSinDepartamento(department) {
  const id = department.id || department._id;
  const codigo = String(department.codigo || '')
    .trim()
    .toUpperCase();
  const nombre = String(department.nombre || '')
    .trim()
    .toLowerCase();
  return id === SIN_DEPARTAMENTO || codigo === 'SIN' || nombre === SIN_DEPARTAMENTO.toLowerCase();
}

function makeRow(id, codigo, nombre, totals, nota) {
  const ingresos = round4(Number(totals?.ingresos) || 0);
  const gastos = round4(Number(totals?.gastos) || 0);
  return {
    id,
    codigo: codigo || '',
    nombre: nombre || id,
    nota: nota || '',
    ingresos,
    gastos,
    saldoNeto: round4(Number(totals?.saldoNeto) || ingresos - gastos),
  };
}

function renderRow(row) {
  const saldoClass = row.saldoNeto > 0 ? 'amount-positive' : row.saldoNeto < 0 ? 'amount-negative' : '';
  const hasMovements = row.ingresos !== 0 || row.gastos !== 0;
  const note = row.nota || (hasMovements ? 'Con movimientos contabilizados' : 'Sin movimientos contabilizados');
  return `
    <tr>
      <td>
        <span class="transaction-main"
          ><strong>${escapeHtml(row.nombre)}</strong
          ><small>${escapeHtml(note)}</small></span
        >
      </td>
      <td>${escapeHtml(row.codigo || '—')}</td>
      <td class="amount-col">${escapeHtml(formatCurrency(row.ingresos))}</td>
      <td class="amount-col">${escapeHtml(formatCurrency(row.gastos))}</td>
      <td class="amount-col ${saldoClass}">${escapeHtml(formatCurrency(row.saldoNeto))}</td>
    </tr>
  `;
}

function renderMetricCard(label, id, value, iconClass, iconPath, foot) {
  return `
    <article class="metric-card">
      <div class="metric-top">
        <span class="metric-label">${escapeHtml(label)}</span>
        <span class="metric-icon ${iconClass}"><svg viewBox="0 0 24 24">${iconPath}</svg></span>
      </div>
      <div class="metric-value" id="${id}">${escapeHtml(value)}</div>
      <div class="metric-foot"><span>${escapeHtml(foot)}</span></div>
    </article>
  `;
}

function resolveActivePeriod(settings) {
  const active = settings?.activePeriod || {};
  const from = typeof active.from === 'string' ? active.from : '';
  const to = typeof active.to === 'string' ? active.to : '';
  if (isValidDate(from) && isValidDate(to) && from <= to) return { from, to };
  return rangeOf(active.preset === 'quarter' ? 'quarter' : 'month');
}

function rangeOf(preset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === 'year') {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }

  if (preset === 'quarter') {
    const firstMonth = Math.floor(month / 3) * 3;
    const endMonth = firstMonth + 2;
    return {
      from: `${year}-${String(firstMonth + 1).padStart(2, '0')}-01`,
      to: `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(new Date(year, endMonth + 1, 0).getDate()).padStart(2, '0')}`,
    };
  }

  return {
    from: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    to: `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`,
  };
}

function detectPreset(from, to) {
  const active = resolveActivePeriod(loadSettings());
  if (active.from === from && active.to === to) return 'active';
  for (const preset of ['month', 'quarter', 'year']) {
    const range = rangeOf(preset);
    if (range.from === from && range.to === to) return preset;
  }
  return 'custom';
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function round4(value) {
  return Number((Number(value) || 0).toFixed(4));
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  const fixed = Math.abs(amount).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  const [integer, decimals] = fixed.split('.');
  const grouped = (integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}$${grouped}.${(decimals || '').padEnd(2, '0')}`;
}

function formatDate(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}
