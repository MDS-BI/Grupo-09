import { loadCollection } from '../storage.js';
import { ENTRY_STATE } from '../domain/entry.js';

import { loadSettings } from '../services/settings-service.js';
import { formatAmount } from '../utils/money.js';

export const viewInfo = {
  title: 'Reportes financieros',
  breadcrumb: 'Reportes',
  description: 'Consulta el estado de resultados y el flujo de caja de tu empresa.',
  action: 'Generar reporte',
};

const state = { preset: 'active', from: '', to: '', activeTab: 'resultado' };
let boundDocument = null;
let boundWindow = null;

export function render() {
  bindListeners();
  const period = resolveActivePeriod(loadSettings());
  state.preset = 'active';
  state.from = period.from;
  state.to = period.to;
  state.activeTab = 'resultado';

  return `
    <section class="reportes-view" id="reportes-view" aria-label="Reportes financieros" style="width: 100%">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-line"></span> REPORTES FINANCIEROS</div>
          <h1>Reportes financieros</h1>
          <p class="subtitle">Estado de resultados y flujo de caja generados a partir de asientos contabilizados.</p>
        </div>
        <div class="heading-actions">
          <span class="period-label"
            ><span class="status-dot"></span>Asientos contabilizados:
            <strong id="report-posted-count">${countPosted(state.from, state.to)}</strong></span
          >
        </div>
      </div>

      <div class="period-toolbar">
        <div class="period-tabs" role="tablist" aria-label="Período contable">
          ${renderPresetTabs()}
        </div>
        <div class="table-actions">
          <label class="table-search" style="font-size: 10px"
            >Desde <input type="date" id="report-from" value="${escapeHtml(state.from)}" aria-label="Fecha inicial del período"
          /></label>
          <label class="table-search" style="font-size: 10px"
            >Hasta <input type="date" id="report-to" value="${escapeHtml(state.to)}" aria-label="Fecha final del período"
          /></label>
          <button
            class="button button-primary button-compact"
            id="report-generate"
            type="button"
            data-action="report-generate"
          >
            ${escapeHtml(viewInfo.action)}
          </button>
        </div>
      </div>

      <div
        id="report-feedback"
        role="alert"
        style="margin-bottom: 12px; padding: 10px 14px; border-left: 3px solid #c76854; background: #fff7f5; font-size: 11px; color: #c76854"
        hidden
      ></div>

      <div id="report-results">${renderResults()}</div>
    </section>
  `;
}

export default render;

function bindListeners() {
  if (typeof document === 'undefined' || boundDocument === document) return;
  boundDocument = document;

  document.addEventListener('click', (event) => {
    const root = event.target.closest?.('#reportes-view');
    if (!root) return;

    if (event.target.closest?.('#report-generate, [data-action="report-generate"]')) {
      generate();
      return;
    }

    const presetButton = event.target.closest?.('[data-period]');
    if (presetButton) {
      applyPreset(presetButton.dataset.period);
      return;
    }

    const tabButton = event.target.closest?.('[data-report-tab]');
    if (tabButton) {
      selectTab(tabButton.dataset.reportTab);
    }
  });

  document.addEventListener('change', (event) => {
    if (!event.target.closest?.('#reportes-view')) return;
    if (event.target.matches('#report-from, #report-to')) generate();
  });

  document.addEventListener('finance:data-changed', () => updateResults());
  if (boundWindow !== window) {
    boundWindow = window;
    window.addEventListener('storage', (event) => {
      if (
        !event.key ||
        event.key.startsWith('@erp-envelope:entries') ||
        event.key.startsWith('@erp-envelope:accounts') ||
        event.key === '@erp-settings'
      ) {
        updateResults();
      }
    });
  }
}

export function generate() {
  const root = document.querySelector('#reportes-view');
  if (!root) return;
  const from = String(root.querySelector('#report-from')?.value ?? '').trim();
  const to = String(root.querySelector('#report-to')?.value ?? '').trim();

  if (!isValidDate(from) || !isValidDate(to)) {
    setFeedback('Selecciona una fecha inicial y una fecha final válidas para generar el reporte.');
    return;
  }
  if (from > to) {
    setFeedback("Rango de fechas inválido: 'Desde' no puede ser posterior a 'Hasta'.");
    return;
  }

  state.from = from;
  state.to = to;
  state.preset = detectPreset(from, to);
  syncToolbar();
  updateResults();
  setFeedback('Reporte actualizado para el período seleccionado.', 'success');
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

function selectTab(tab) {
  state.activeTab = tab === 'flujo' ? 'flujo' : 'resultado';
  const root = document.querySelector('#reportes-view');
  if (!root) return;
  root.querySelectorAll('[data-report-tab]').forEach((button) => {
    const selected = button.dataset.reportTab === state.activeTab;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  const resultadoPanel = root.querySelector('#report-resultado');
  const flujoPanel = root.querySelector('#report-flujo');
  if (resultadoPanel) resultadoPanel.hidden = state.activeTab !== 'resultado';
  if (flujoPanel) flujoPanel.hidden = state.activeTab !== 'flujo';
}

function syncToolbar() {
  const root = document.querySelector('#reportes-view');
  if (!root) return;
  root.querySelectorAll('[data-period]').forEach((button) => {
    const selected = button.dataset.period === state.preset;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  const fromInput = root.querySelector('#report-from');
  const toInput = root.querySelector('#report-to');
  if (fromInput) fromInput.value = state.from;
  if (toInput) toInput.value = state.to;
  const count = root.querySelector('#report-posted-count');
  if (count) count.textContent = String(countPosted(state.from, state.to));
}

function setFeedback(message, type = 'error') {
  const feedback = document.querySelector('#reportes-view #report-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = !message;
  feedback.setAttribute('role', type === 'error' ? 'alert' : 'status');
  feedback.style.borderLeftColor = type === 'error' ? '#c76854' : '#2f9e6f';
  feedback.style.background = type === 'error' ? '#fff7f5' : '#f3fbf7';
  feedback.style.color = type === 'error' ? '#c76854' : '#247a55';
}

function clearFeedback() {
  setFeedback('');
}

function updateResults() {
  const container = document.querySelector('#reportes-view #report-results');
  if (!container) return;
  container.innerHTML = renderResults();
  syncToolbar();
  selectTab(state.activeTab);
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
  const data = buildReportData(state.from, state.to);
  const hasMovements = data.posted.length > 0;

  return `
    <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); width: 100%">
      ${renderMetricCard('Ingresos totales', 'report-metric-ingresos', formatFixed(data.statement.ingresos), 'icon-green', '<path d="M4 16 10 10l4 4 6-7M14 7h6v6" />')}
      ${renderMetricCard('Gastos totales', 'report-metric-gastos', formatFixed(data.statement.gastos), 'icon-amber', '<path d="M4 8 10 14l4-4 6 7M14 17h6v-6" />')}
      ${renderMetricCard('Resultado neto', 'report-metric-resultado', formatFixed(data.statement.resultadoNeto), 'icon-blue', '<path d="M4 19V5m0 14h16M8 15l4-5 3 2 5-7" />')}
      ${renderMetricCard('Flujo de caja', 'report-metric-flujo', formatFixed(data.cashFlow), 'icon-violet', '<path d="M4 17h4v-5H4v5Zm6 0h4V8h-4v9Zm6 0h4V4h-4v13Z" />')}
    </div>

    <div class="period-toolbar">
      <div class="period-tabs" role="tablist" aria-label="Tipo de reporte">
        <button
          class="period-tab${state.activeTab === 'resultado' ? ' selected' : ''}"
          type="button"
          role="tab"
          aria-selected="${state.activeTab === 'resultado'}"
          data-report-tab="resultado"
          >Estado de Resultados</button
        >
        <button
          class="period-tab${state.activeTab === 'flujo' ? ' selected' : ''}"
          type="button"
          role="tab"
          aria-selected="${state.activeTab === 'flujo'}"
          data-report-tab="flujo"
          >Flujo de Caja</button
        >
      </div>
      <span class="period-label" data-period-from="${escapeHtml(state.from)}" data-period-to="${escapeHtml(state.to)}">${renderPeriodLabel()}</span>
    </div>

    <section class="panel transactions-panel" id="report-resultado"${state.activeTab === 'resultado' ? '' : ' hidden'}>
      <div class="panel-heading transactions-heading">
        <div>
          <h2>Estado de Resultados</h2>
          <p>Saldos agrupados por cuenta de tipo Ingreso o Gasto · cifras con precisión de 4 decimales</p>
        </div>
        <div class="table-actions"><span class="period-label">${data.posted.length} asientos contabilizados</span></div>
      </div>
      ${renderStatementContent(data, hasMovements)}
      <div class="table-footer">
        <span
          >Solo cuentas de tipo Ingreso o Gasto (se excluyen Activo, Pasivo y Patrimonio) y asientos en estado
          Contabilizada: se descartan Borrador, Pendiente, Aprobada y Revertida. </span
        >
        <span class="period-label" data-period-from="${escapeHtml(state.from)}" data-period-to="${escapeHtml(state.to)}">${renderPeriodLabel()}</span>
      </div>
    </section>

    <section class="panel transactions-panel" id="report-flujo"${state.activeTab === 'flujo' ? '' : ' hidden'}>
      <div class="panel-heading transactions-heading">
        <div>
          <h2>Flujo de Caja</h2>
          <p>Movimientos de las cuentas designadas como efectivo/bancos (es_efectivo)</p>
        </div>
        <div class="table-actions"><span class="period-label">${data.posted.length} asientos contabilizados</span></div>
      </div>
      ${
        hasMovements && data.cashRows.length
          ? renderCashFlowTable(data)
          : `<div class="no-results">No hay movimientos de cuentas de efectivo en el período seleccionado.</div>`
      }
      <div class="table-footer">
        <span>Mismo criterio es_efectivo que el Panel general · solo asientos Contabilizada.</span>
        <span class="period-label" data-period-from="${escapeHtml(state.from)}" data-period-to="${escapeHtml(state.to)}">${renderPeriodLabel()}</span>
      </div>
    </section>
  `;
}

function renderPeriodLabel() {
  const pretty = `${formatDate(state.from)} — ${formatDate(state.to)}`;
  const iso = `${state.from} — ${state.to}`;
  return `Período: <strong>${escapeHtml(pretty)}</strong><span class="sr-only"> ${escapeHtml(iso)}</span>`;
}

function renderStatementContent(data, hasMovements) {
  if (data.statementRows.length) return renderIncomeStatementTable(data);
  if (!hasMovements) {
    return `<div class="no-results">No hay movimientos contabilizados en el período seleccionado.</div>`;
  }
  return `<div class="no-results">No hay cuentas de tipo Ingreso o Gasto con movimiento en el período seleccionado.</div>`;
}

function renderIncomeStatementTable(data) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CUENTA</th>
            <th>TIPO</th>
            <th>NATURALEZA</th>
            <th class="amount-col">INGRESOS</th>
            <th class="amount-col">GASTOS</th>
          </tr>
        </thead>
        <tbody>
          ${data.statementRows.map(renderStatementRow).join('')}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="3">Totales del período</th>
            <th class="amount-col">${escapeHtml(formatFixed(data.statement.ingresos))}</th>
            <th class="amount-col">${escapeHtml(formatFixed(data.statement.gastos))}</th>
          </tr>
          <tr>
            <th colspan="3">Utilidad / Pérdida neta</th>
            <th colspan="2" class="amount-col">${escapeHtml(formatFixed(data.statement.resultadoNeto))}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function renderStatementRow(row) {
  return `
    <tr>
      <td>
        <span class="transaction-main"
          ><strong>${escapeHtml(row.nombre)}</strong
          ><small>${escapeHtml(row.codigo || row.id)}</small></span
        >
      </td>
      <td>${escapeHtml(row.tipo || '—')}</td>
      <td>${escapeHtml(row.naturaleza || '—')}</td>
      <td class="amount-col ${row.ingresos > 0 ? 'amount-positive' : ''}">${escapeHtml(formatFixed(row.ingresos))}</td>
      <td class="amount-col ${row.gastos > 0 ? 'amount-negative' : ''}">${escapeHtml(formatFixed(row.gastos))}</td>
    </tr>
  `;
}

function renderCashFlowTable(data) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CUENTA DE EFECTIVO</th>
            <th class="amount-col">ENTRADAS (DEBE)</th>
            <th class="amount-col">SALIDAS (HABER)</th>
            <th class="amount-col">MOVIMIENTO TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${data.cashRows.map(renderCashRow).join('')}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="3">Flujo de caja del período</th>
            <th class="amount-col">${escapeHtml(formatFixed(data.cashFlow))}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function renderCashRow(row) {
  return `
    <tr>
      <td>
        <span class="transaction-main"
          ><strong>${escapeHtml(row.nombre)}</strong
          ><small>${escapeHtml(row.codigo || row.id)}</small></span
        >
      </td>
      <td class="amount-col amount-positive">${escapeHtml(formatFixed(row.entradas))}</td>
      <td class="amount-col amount-negative">${escapeHtml(formatFixed(row.salidas))}</td>
      <td class="amount-col">${escapeHtml(formatFixed(row.total))}</td>
    </tr>
  `;
}

function renderMetricCard(label, id, value, iconClass, iconPath) {
  return `
    <article class="metric-card">
      <div class="metric-top">
        <span class="metric-label">${escapeHtml(label)}</span>
        <span class="metric-icon ${iconClass}"><svg viewBox="0 0 24 24">${iconPath}</svg></span>
      </div>
      <div class="metric-value" id="${id}">${escapeHtml(value)}</div>
      <div class="metric-foot"><span>Período contable seleccionado</span></div>
    </article>
  `;
}

function loadPostedEntries(from, to) {
  const records = loadCollection('entries').records || [];
  return records.filter((entry) => {
    if (String(entry?.estado ?? '') !== ENTRY_STATE.CONTABILIZADA) return false;
    const date = entryDate(entry);
    return Boolean(date) && date >= from && date <= to;
  });
}

function entryDate(entry) {
  for (const key of ['fecha_contable', 'fecha', 'date', 'fechaContable']) {
    const value = entry?.[key];
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  }
  return '';
}

function buildReportData(from, to) {
  const posted = loadPostedEntries(from, to);
  const accountsById = new Map(
    loadCollection('accounts')
      .records.filter(Boolean)
      .map((account) => [account.id, account]),
  );

  const statementBuckets = new Map();
  const cashBuckets = new Map();

  for (const entry of posted) {
    for (const line of entry.detalles || []) {
      const account = accountsById.get(line.id_cuenta);
      if (!account) continue;
      const debe = Number(line.monto_debe) || 0;
      const haber = Number(line.monto_haber) || 0;

      if (account.es_efectivo === true) {
        const cashBucket = getBucket(cashBuckets, account);
        cashBucket.entradas += debe;
        cashBucket.salidas += haber;
      }

      const kind = accountKind(account);
      if (!kind) continue;

      const statementBucket = getBucket(statementBuckets, account);
      statementBucket.moved = true;
      if (kind === 'ingreso') statementBucket.ingresos += haber - debe;
      else statementBucket.gastos += debe - haber;
    }
  }

  const statementRows = [...statementBuckets.values()]
    .map((row) => ({
      ...row,
      ingresos: round4(row.ingresos),
      gastos: round4(row.gastos),
    }))
    .filter((row) => row.moved)
    .sort(compareAccounts);

  const ingresos = round4(statementRows.reduce((total, row) => total + row.ingresos, 0));
  const gastos = round4(statementRows.reduce((total, row) => total + row.gastos, 0));
  const statement = { ingresos, gastos, resultadoNeto: round4(ingresos - gastos) };

  const cashRows = [...cashBuckets.values()]
    .map((row) => ({
      ...row,
      entradas: round4(row.entradas),
      salidas: round4(row.salidas),
      total: round4(row.entradas - row.salidas),
    }))
    .filter((row) => row.total !== 0)
    .sort(compareAccounts);

  const cashFlow = round4(cashRows.reduce((total, row) => total + row.total, 0));

  return { statement, cashFlow, posted, statementRows, cashRows };
}

function accountKind(account) {
  const tipo = String(account?.tipo || '')
    .trim()
    .toLowerCase();
  if (tipo === 'ingreso') return 'ingreso';
  if (tipo === 'gasto' || tipo === 'egreso') return 'gasto';
  return null;
}

function getBucket(buckets, account) {
  let bucket = buckets.get(account.id);
  if (!bucket) {
    bucket = {
      id: account.id,
      codigo: account.codigo || '',
      nombre: account.nombre || account.codigo || account.id,
      tipo: account.tipo || '',
      naturaleza: account.naturaleza || '',
      moved: false,
      ingresos: 0,
      gastos: 0,
      entradas: 0,
      salidas: 0,
    };
    buckets.set(account.id, bucket);
  }
  return bucket;
}

function compareAccounts(left, right) {
  const group = (row) => (['Ingreso', 'Gasto', 'Egreso'].includes(row.tipo) ? 0 : 1);
  const groupDiff = group(left) - group(right);
  if (groupDiff !== 0) return groupDiff;
  return String(left.codigo || left.id).localeCompare(String(right.codigo || right.id), 'es');
}

function countPosted(from, to) {
  return loadPostedEntries(from, to).length;
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

function formatFixed(value) {
  const amount = Number(value) || 0;
  const [integer, decimals] = formatAmount(Math.abs(amount)).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}$${grouped}.${decimals}`;
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
