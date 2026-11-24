import { loadCollection } from '../storage.js';
import { ENTRY_STATE } from '../domain/entry.js';
import {
  filterEntries,
  getDistinctAccounts,
  getDistinctDepartments,
} from '../services/query-service.js';

export const viewInfo = {
  title: 'Consulta',
  breadcrumb: 'Consulta',
  description: 'Busca asientos y movimientos con filtros combinados.',
  action: 'Nueva búsqueda',
};

const FILTER_KEYS = [
  'busqueda_texto',
  'fecha_desde',
  'fecha_hasta',
  'id_cuenta',
  'id_departamento',
  'estado',
];

const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, '']));

const DATE_RANGE_MESSAGE = "La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'";
const FULL_WIDTH_STYLE = 'width: 100%; box-sizing: border-box';
const FILTER_GRID_STYLE = `display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; ${FULL_WIDTH_STYLE}`;
const FIELD_LABEL_STYLE =
  "display: block; margin-bottom: 6px; color: #667386; font: 700 10px 'DM Sans', sans-serif; letter-spacing: 0.3px";
const FIELD_CONTROL_STYLE = `height: 36px; padding: 0 10px; border: 1px solid #e1e6ee; border-radius: 7px; background: #fff; color: #344054; font: 500 11px 'DM Sans', sans-serif; ${FULL_WIDTH_STYLE}`;
const DATE_WARNING_STYLE = `margin-top: 12px; padding: 10px 12px; border: 1px solid #f1c9c9; border-left: 3px solid #d64545; border-radius: 7px; background: #fff8f8; color: #a12d2d; font: 600 11px 'DM Sans', sans-serif; ${FULL_WIDTH_STYLE}`;

export function render() {
  ensureListeners();
  FILTER_KEYS.forEach((key) => {
    filters[key] = '';
  });

  const catalog = buildCatalog();
  const results = runQuery(catalog);

  return `
    <section class="consulta-view" id="consulta-view" style="${FULL_WIDTH_STYLE}">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-line"></span> CONSULTA HISTÓRICA</div>
          <h1>Consulta histórica</h1>
          <p class="subtitle">Busca asientos y sus movimientos por fecha, cuenta, centro de costo y estado.</p>
        </div>
        <div class="heading-actions">
          <button class="button button-secondary" type="button" id="reset-filters" data-action="reset-filters">
            Restablecer filtros
          </button>
        </div>
      </div>

      <section class="panel query-filters" id="query-filters" aria-label="Filtros de consulta" style="${FULL_WIDTH_STYLE}">
        <div class="panel-heading">
          <div>
            <h2>Filtros de búsqueda</h2>
            <p>Combina varios criterios para obtener solo los asientos que cumplen todos.</p>
          </div>
        </div>
        <div class="query-filter-grid" style="${FILTER_GRID_STYLE}">
          <div class="query-field">
            <label for="query-search" style="${FIELD_LABEL_STYLE}">Buscar</label>
            <input id="query-search" name="busqueda_texto" data-filter="busqueda_texto" type="search"
              placeholder="Descripción, documento, cuenta o glosa" value="${escapeHtml(filters.busqueda_texto)}"
              style="${FIELD_CONTROL_STYLE}" />
          </div>
          <div class="query-field">
            <label for="query-desde" style="${FIELD_LABEL_STYLE}">Desde</label>
            <input id="query-desde" name="fecha_desde" data-filter="fecha_desde" type="date"
              value="${escapeHtml(filters.fecha_desde)}" style="${FIELD_CONTROL_STYLE}" />
          </div>
          <div class="query-field">
            <label for="query-hasta" style="${FIELD_LABEL_STYLE}">Hasta</label>
            <input id="query-hasta" name="fecha_hasta" data-filter="fecha_hasta" type="date"
              value="${escapeHtml(filters.fecha_hasta)}" style="${FIELD_CONTROL_STYLE}" />
          </div>
          <div class="query-field">
            <label for="query-cuenta" style="${FIELD_LABEL_STYLE}">Cuenta contable</label>
            <select id="query-cuenta" name="id_cuenta" data-filter="id_cuenta" style="${FIELD_CONTROL_STYLE}">
              ${renderOptions(catalog.accounts, filters.id_cuenta, 'Todas las cuentas')}
            </select>
          </div>
          <div class="query-field">
            <label for="query-centro" style="${FIELD_LABEL_STYLE}">Centro de costo</label>
            <select id="query-centro" name="id_departamento" data-filter="id_departamento" style="${FIELD_CONTROL_STYLE}">
              ${renderOptions(catalog.departments, filters.id_departamento, 'Todos los centros de costo')}
            </select>
          </div>
          <div class="query-field">
            <label for="query-estado" style="${FIELD_LABEL_STYLE}">Estado del asiento</label>
            <select id="query-estado" name="estado" data-filter="estado" style="${FIELD_CONTROL_STYLE}">
              <option value="">Todos los estados</option>
              ${Object.values(ENTRY_STATE)
                .map(
                  (state) =>
                    `<option value="${escapeHtml(state)}"${filters.estado === state ? ' selected' : ''}>${escapeHtml(state)}</option>`,
                )
                .join('')}
            </select>
          </div>
        </div>
        <div class="query-date-warning" id="query-date-warning" role="alert" style="${DATE_WARNING_STYLE}${isInvalidDateRange() ? '' : '; display: none'}"${isInvalidDateRange() ? '' : ' hidden'}>${DATE_RANGE_MESSAGE}</div>
      </section>

      <div id="query-results" style="${FULL_WIDTH_STYLE}">${renderResults(results, catalog)}</div>
    </section>
  `;
}

export function refreshConsultaView() {
  if (typeof document === 'undefined') return;
  updateResults();
}

export function renderConsulta() {
  return render();
}

export default render;

function ensureListeners() {
  if (typeof document === 'undefined' || document.__consultaListenersBound) return;
  document.__consultaListenersBound = true;

  document.addEventListener('input', (event) => {
    if (!isFilterControl(event.target)) return;
    filters[event.target.dataset.filter] = event.target.value.trim();
    updateResults();
  });

  document.addEventListener('change', (event) => {
    if (!isFilterControl(event.target)) return;
    filters[event.target.dataset.filter] = event.target.value.trim();
    updateResults();
  });

  document.addEventListener('click', (event) => {
    const action = event.target.closest?.('#consulta-view [data-action]')?.dataset.action;
    if (action === 'clear-filters' || action === 'reset-filters') clearFilters();
  });

  window.addEventListener('storage', (event) => {
    if (!event.key || event.key.startsWith('@erp-envelope:')) updateResults();
  });
}

function isFilterControl(element) {
  return Boolean(element?.closest?.('#consulta-view [data-filter]'));
}

function clearFilters() {
  FILTER_KEYS.forEach((key) => {
    filters[key] = '';
  });
  const root = document.querySelector('#consulta-view');
  root?.querySelectorAll('[data-filter]').forEach((control) => {
    control.value = '';
  });
  updateResults();
}

function isInvalidDateRange() {
  return Boolean(
    filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta,
  );
}

function syncDateRangeWarning() {
  const invalid = isInvalidDateRange();
  const warning = document.querySelector('#consulta-view #query-date-warning');
  if (warning) {
    warning.hidden = !invalid;
    warning.style.display = invalid ? 'block' : 'none';
    warning.textContent = DATE_RANGE_MESSAGE;
  }
  ['query-desde', 'query-hasta'].forEach((id) => {
    document.querySelector(`#consulta-view #${id}`)?.setAttribute('aria-invalid', String(invalid));
  });
}

function selectedLines(entry) {
  return (entry?.detalles || []).filter((line) => {
    if (!line) return false;
    if (filters.id_cuenta && line.id_cuenta !== filters.id_cuenta) return false;
    if (filters.id_departamento && line.id_departamento !== filters.id_departamento) return false;
    return true;
  });
}

function updateResults() {
  const container = document.querySelector('#consulta-view #query-results');
  if (!container) return;
  syncDateRangeWarning();
  const catalog = buildCatalog();
  container.innerHTML = renderResults(runQuery(catalog), catalog);
}

function runQuery(catalog) {
  if (isInvalidDateRange()) return [];

  let results;
  try {
    results = filterEntries({ ...filters });
  } catch {
    results = loadCollection('entries').records;
    results = results.filter((entry) => matchesFiltersLocally(entry));
  }

  if (!filters.estado) {
    results = results.filter((entry) => entry.estado !== ENTRY_STATE.REVERTIDA);
  }

  if (filters.busqueda_texto) {
    results = results.filter((entry) => matchesMovementText(entry, filters.busqueda_texto, catalog));
  }

  return results.slice().sort((left, right) =>
    String(right.fecha_contable || '').localeCompare(String(left.fecha_contable || '')),
  );
}

function matchesFiltersLocally(entry) {
  const lines = entry.detalles || [];
  if (!filters.estado && entry.estado === ENTRY_STATE.REVERTIDA) return false;
  if (filters.fecha_desde && String(entry.fecha_contable || '') < filters.fecha_desde) return false;
  if (filters.fecha_hasta && String(entry.fecha_contable || '') > filters.fecha_hasta) return false;
  if (filters.estado && entry.estado !== filters.estado) return false;
  if (filters.id_cuenta && !lines.some((line) => line.id_cuenta === filters.id_cuenta)) return false;
  if (filters.id_departamento && !lines.some((line) => line.id_departamento === filters.id_departamento)) {
    return false;
  }
  if (filters.busqueda_texto) {
    const haystack = [entry.descripcion, entry.numero_documento, entry.tipo_documento]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('es');
    if (!haystack.includes(filters.busqueda_texto.toLocaleLowerCase('es'))) return false;
  }
  return true;
}

function matchesMovementText(entry, query, catalog) {
  const text = [
    entry.id,
    entry.descripcion,
    entry.numero_documento,
    entry.tipo_documento,
    ...selectedLines(entry).flatMap((line) => [
      line.glosa,
      line.id_cuenta,
      line.id_departamento,
      catalog.accountLabel(line.id_cuenta),
      catalog.departmentLabel(line.id_departamento),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('es');
  return text.includes(query.toLocaleLowerCase('es'));
}

function renderResults(results, catalog) {
  const totals = sumTotals(results);
  const hasResults = results.length > 0;

  return `
    <div class="query-summary" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 14px 0; ${FULL_WIDTH_STYLE}">
      <div class="panel" style="padding: 14px; ${FULL_WIDTH_STYLE}">
        <span class="eyebrow">RESULTADOS</span>
        <strong id="query-count" style="display: block; margin-top: 6px; font: 700 22px Manrope, sans-serif">${results.length}</strong>
        <span style="font-size: 10px; color: #8792a2">asientos encontrados</span>
      </div>
      <div class="panel" style="padding: 14px; ${FULL_WIDTH_STYLE}">
        <span class="eyebrow">TOTAL DEBE</span>
        <strong id="query-total-debe" style="display: block; margin-top: 6px; font: 700 22px Manrope, sans-serif">${escapeHtml(formatCurrency(totals.debe))}</strong>
        <span style="font-size: 10px; color: #8792a2">suma de movimientos</span>
      </div>
      <div class="panel" style="padding: 14px; ${FULL_WIDTH_STYLE}">
        <span class="eyebrow">TOTAL HABER</span>
        <strong id="query-total-haber" style="display: block; margin-top: 6px; font: 700 22px Manrope, sans-serif">${escapeHtml(formatCurrency(totals.haber))}</strong>
        <span style="font-size: 10px; color: #8792a2">suma de movimientos</span>
      </div>
    </div>

    <section class="panel transactions-panel" style="${FULL_WIDTH_STYLE}">
      <div class="panel-heading">
        <div>
          <h2>Resultados de la consulta</h2>
          <p>Asientos y movimientos registrados en el almacenamiento local</p>
        </div>
      </div>
      <div class="table-wrap" style="${FULL_WIDTH_STYLE}">
        <table style="${FULL_WIDTH_STYLE}">
          <thead>
            <tr>
              <th>FECHA</th>
              <th>ASIENTO</th>
              <th>MOVIMIENTOS</th>
              <th class="amount-col">DEBE</th>
              <th class="amount-col">HABER</th>
              <th>ESTADO</th>
            </tr>
          </thead>
          <tbody id="query-results-body">
            ${results.map((entry) => renderEntryRow(entry, catalog)).join('')}
          </tbody>
          <tfoot${hasResults ? '' : ' hidden'}>
            <tr>
              <th colspan="3">Totales de la consulta</th>
              <th class="amount-col">${escapeHtml(formatCurrency(totals.debe))}</th>
              <th class="amount-col">${escapeHtml(formatCurrency(totals.haber))}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
        <div class="empty-state" id="query-empty-state" role="status"${hasResults ? ' hidden' : ''} style="padding: 26px; text-align: center">
          <p style="font-weight: 700; color: #344054; margin: 0 0 6px">No se encontraron registros con los filtros aplicados.</p>
          <p style="font-size: 11px; color: #8792a2; margin: 0 0 14px">Prueba con otro rango de fechas, cuenta, centro de costo o estado.</p>
          <button class="button button-primary" type="button" id="clear-filters" data-action="clear-filters">Limpiar filtros</button>
        </div>
      </div>
      <div class="table-footer">
        <span>Mostrando <strong>${results.length}</strong> asientos</span>
        <span class="period-label">${hasResults ? 'Totales calculados sobre los movimientos de los asientos mostrados' : 'Sin resultados para mostrar'}</span>
      </div>
    </section>
  `;
}

function renderEntryRow(entry, catalog) {
  const lines = selectedLines(entry);
  const debe = sumLines(lines, 'monto_debe');
  const haber = sumLines(lines, 'monto_haber');
  const movements = lines.length
    ? lines
        .map(
          (line) =>
            `${catalog.accountLabel(line.id_cuenta)} · ${catalog.departmentLabel(line.id_departamento)}${
              line.glosa ? ` · ${line.glosa}` : ''
            }`,
        )
        .join(' | ')
    : 'Sin movimientos registrados';

  return `
    <tr data-entry-id="${escapeHtml(entry.id || '')}" data-estado="${escapeHtml(entry.estado || '')}">
      <td>${escapeHtml(formatDate(entry.fecha_contable))}</td>
      <td>
        <span class="transaction-main">
          <strong>${escapeHtml(entry.descripcion || 'Asiento contable')}</strong>
          <small>${escapeHtml([entry.tipo_documento, entry.numero_documento].filter(Boolean).join(' · ') || entry.id || '')}</small>
        </span>
      </td>
      <td style="white-space: normal">${escapeHtml(movements)}</td>
      <td class="amount-col">${escapeHtml(formatCurrency(debe))}</td>
      <td class="amount-col">${escapeHtml(formatCurrency(haber))}</td>
      <td>${renderStatePill(entry.estado)}</td>
    </tr>
  `;
}

function renderStatePill(state) {
  const value = Object.values(ENTRY_STATE).includes(state) ? state : ENTRY_STATE.BORRADOR;
  const approved = value === ENTRY_STATE.CONTABILIZADA || value === ENTRY_STATE.APROBADA;
  return `<span class="status-pill ${approved ? 'status-approved' : 'status-pending'}"><i></i>${escapeHtml(value)}</span>`;
}

function sumTotals(entries) {
  return entries.reduce(
    (totals, entry) => {
      const lines = selectedLines(entry);
      totals.debe += sumLines(lines, 'monto_debe');
      totals.haber += sumLines(lines, 'monto_haber');
      return totals;
    },
    { debe: 0, haber: 0 },
  );
}

function sumLines(lines, field) {
  const total = lines.reduce((sum, line) => sum + (Number(line[field]) || 0), 0);
  return Math.round(total * 10000) / 10000;
}

function buildCatalog() {
  const accountItems = [
    ...loadCollection('accounts').records,
    ...loadCollection('cuentas-contables').records,
    ...getDistinctAccounts().map((id) => ({ id, codigo: id })),
  ];
  const accountById = indexRecords(accountItems);
  const accountLabel = (id) => {
    if (!id) return 'Sin cuenta';
    const item = accountById.get(id);
    return item ? labelFor(item) : id;
  };

  const departmentItems = [
    ...loadCollection('@erp-department-base').records,
    ...loadCollection('centros-costo').records,
    ...getDistinctDepartments().map((id) => ({ id, nombre: id })),
  ];
  const departmentById = indexRecords(departmentItems);
  const departmentLabel = (id) => {
    if (!id) return 'Sin departamento';
    const item = departmentById.get(id);
    return item ? item.nombre || item.codigo || item.id : id;
  };

  return {
    accounts: [...accountById.values()].map((item) => ({ id: item.id, label: labelFor(item) })),
    departments: [...departmentById.values()].map((item) => ({
      id: item.id,
      label: [item.codigo, item.nombre].filter(Boolean).join(' · ') || item.id,
    })),
    accountLabel,
    departmentLabel,
  };
}

function indexRecords(records) {
  const byId = new Map();
  records.filter(Boolean).forEach((item) => {
    const id = item.id || item._id;
    if (!id || byId.has(id)) return;
    byId.set(id, { ...item, id });
  });
  return byId;
}

function labelFor(item) {
  return [item.codigo, item.nombre].filter(Boolean).join(' · ') || item.id;
}

function renderOptions(items, selected, placeholder) {
  return `
    <option value="">${escapeHtml(placeholder)}</option>
    ${items
      .map(
        (item) =>
          `<option value="${escapeHtml(item.id)}"${selected === item.id ? ' selected' : ''}>${escapeHtml(item.label || item.id)}</option>`,
      )
      .join('')}
  `;
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  const fixed = Math.abs(amount).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  const [integer, decimals] = fixed.split('.');
  return `${amount < 0 ? '-' : ''}$${integer}.${(decimals || '').padEnd(2, '0')}`;
}

function formatDate(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}
