import { getCurrentUser } from '../services/auth-service.js';
import { loadActivePeriod, loadConfiguredPeriod, saveActivePeriod } from '../services/settings-service.js';
import { filterEntries } from '../services/query-service.js';
import { loadCollection } from '../storage.js';

const POSTED_STATE = 'Contabilizada';
const VISIBLE_MONTHS = 12;
let refreshBound = false;
let dashboardInteractionsBound = false;
let activeRowMenu = null;

export function renderDashboard() {
  const period = resolveActivePeriod(loadActivePeriod());
  const data = buildDashboardData(period);

  bindRefresh();
  bindDashboardInteractions();

  const greetingText = greeting();
  const firstName = String(getCurrentUser()?.name || 'Camila')
    .trim()
    .split(/\s+/)[0];
  const todayLabel = formatLongDate(new Date());
  const periodLabel = `${formatDate(period.from)} — ${formatDate(period.to)}`;
  const postedCount = data.entries.length;
  const visibleCount = Math.min(postedCount, 5);
  const emptyHidden = postedCount > 0 ? ' hidden' : '';
  const maxFlow = Math.max(1, ...data.monthly.flatMap((month) => [month.ingresos, month.gastos]));

  return `
            <div class="page-heading">
              <div>
                <div class="eyebrow"><span class="eyebrow-line"></span> ${escapeHtml(todayLabel)}</div>
                <h1>${escapeHtml(greetingText)}, ${escapeHtml(firstName)} <span class="wave">✳</span></h1>
                <p class="subtitle">Resumen financiero del período contable activo.</p>
              </div>
              <div class="heading-actions">
                <button class="button button-secondary" id="export-button" type="button">
                  <svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4" /></svg>Exportar</button
                ><button class="button button-primary" id="new-transaction" type="button">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>Nueva transacción
                </button>
              </div>
            </div>

            <div class="period-toolbar">
              <div class="period-tabs" role="tablist" aria-label="Período contable activo">
                <button class="period-tab selected" type="button" aria-selected="true">Período activo</button>
              </div>
              <div class="period-picker" style="position: relative">
                <button
                  class="date-filter"
                  id="period-picker-button"
                  type="button"
                  aria-haspopup="true"
                  aria-expanded="false"
                  aria-controls="period-menu"
                >
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 11h18" /></svg
                  >${escapeHtml(periodLabel)}<svg class="chevron" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></svg>
                </button>
                <div
                  class="period-menu"
                  id="period-menu"
                  role="menu"
                  hidden
                  style="position: absolute; right: 0; top: calc(100% + 6px); z-index: 30; min-width: 236px; padding: 6px; border: 1px solid #e6eaf0; border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(27, 39, 58, 0.16)"
                >
                  ${renderPeriodOption('active', 'Período activo configurado')}
                  ${renderPeriodOption('month', 'Mes actual')}
                  ${renderPeriodOption('quarter', 'Trimestre actual')}
                  ${renderPeriodOption('year-2026', 'Año 2026')}
                  ${renderPeriodOption('year-2025', 'Año anterior 2025')}
                </div>
              </div>
            </div>

            <div class="empty-state-panel" id="dashboard-empty"${emptyHidden}>
              <span>Aún no hay asientos contabilizados en el período seleccionado.</span>
              <button class="button button-primary" type="button" data-go="nueva-transaccion">
                Registrar el primer asiento
              </button>
            </div>

            <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))">
              ${renderMetricCard('Ingresos totales', 'metric-ingresos', data.metrics.ingresos, 'icon-green', '<path d="M4 16 10 10l4 4 6-7M14 7h6v6" />')}
              ${renderMetricCard('Gastos totales', 'metric-gastos', data.metrics.gastos, 'icon-amber', '<path d="M4 8 10 14l4-4 6 7M14 17h6v-6" />')}
              ${renderMetricCard('Resultado neto', 'metric-resultado', data.metrics.resultadoNeto, 'icon-blue', '<path d="M4 19V5m0 14h16M8 15l4-5 3 2 5-7" />')}
              ${renderMetricCard('Saldo disponible', 'metric-saldo', data.saldoDisponible, 'icon-violet', '<rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" />')}
              ${renderMetricCard('Flujo de caja', 'metric-flujo', data.metrics.flujoCaja, 'icon-green', '<path d="M4 17h4v-5H4v5Zm6 0h4V8h-4v9Zm6 0h4V4h-4v13Z" />')}
            </div>

            <div class="dashboard-grid">
              <section class="panel cashflow-panel">
                <div class="panel-heading">
                  <div>
                    <h2>Flujo de caja</h2>
                    <p>Movimientos de cuentas de efectivo en el período</p>
                  </div>
                  <strong class="cashflow-total" id="cash-flow-total">${escapeHtml(formatCurrency(data.metrics.flujoCaja))}</strong>
                </div>
                <div class="chart-legend">
                  <span><i class="legend-dot legend-income"></i>Entradas de efectivo</span
                  ><span><i class="legend-dot legend-expense"></i>Salidas de efectivo</span
                  ><strong>${escapeHtml(periodYears(period))}</strong>
                </div>
                <div class="chart-area">
                  <div class="chart-y-labels">
                    ${[maxFlow, maxFlow * 0.75, maxFlow * 0.5, maxFlow * 0.25, 0]
                      .map((value) => `<span>${escapeHtml(formatCompact(value))}</span>`)
                      .join('')}
                  </div>
                  <div class="chart-plot">
                    <div class="chart-gridlines"><i></i><i></i><i></i><i></i><i></i></div>
                    ${
                      data.monthly.length
                        ? `<div class="bar-chart" aria-label="Flujo mensual de entradas y salidas de efectivo">
                            ${data.monthly
                              .map(
                                (month) => `
                                  <div class="bar-group">
                                    <i class="bar income" style="--height: ${barHeight(month.ingresos, maxFlow)}"></i
                                    ><i class="bar expense" style="--height: ${barHeight(month.gastos, maxFlow)}"></i
                                    ><span>${escapeHtml(month.label)}</span>
                                  </div>
                                `,
                              )
                              .join('')}
                          </div>`
                        : '<p class="no-results">Sin movimientos contabilizados en el período seleccionado.</p>'
                    }
                  </div>
                </div>
              </section>

              <section class="panel accounts-panel">
                <div class="panel-heading">
                  <div>
                    <h2>Resumen por cuenta</h2>
                    <p>Saldo de las cuentas de efectivo</p>
                  </div>
                </div>
                <div class="account-total">
                  <span>Saldo total</span><strong id="account-total">${escapeHtml(formatCurrency(data.saldoDisponible))}</strong>
                </div>
                <div class="account-breakdown" id="account-breakdown">${renderAccountBreakdown(data.cashBalances)}</div>
                <div class="account-progress" aria-label="Distribución de cuentas">
                  ${renderAccountProgress(data.cashBalances)}
                </div>
                <button class="text-link" type="button" data-go="plan-cuentas">Ver plan de cuentas <span>→</span></button>
              </section>
            </div>

            <section class="panel transactions-panel">
              <div class="panel-heading transactions-heading">
                <div>
                  <h2>Transacciones recientes</h2>
                  <p>Asientos contabilizados en el período activo</p>
                </div>
                <div class="table-actions">
                  <label class="table-search"
                    ><svg viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-4-4" /></svg
                    ><input
                      id="transaction-search"
                      type="search"
                      placeholder="Buscar transacción..."
                      aria-label="Buscar transacción" /></label
                  ><button class="button button-secondary button-compact" type="button" data-go="transacciones">
                    Ver todas <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>DESCRIPCIÓN</th>
                      <th>CUENTA</th>
                      <th>FECHA</th>
                      <th>CENTRO DE COSTO</th>
                      <th>ESTADO</th>
                      <th class="amount-col">IMPORTE</th>
                      <th><span class="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody id="transactions-body">${renderTransactionRows(data.entries, data.accounts)}</tbody>
                </table>
                <div class="no-results" id="no-results"${postedCount > 0 ? ' hidden' : ''}>
                  No se encontraron transacciones para esta búsqueda.
                </div>
              </div>
              <div class="table-footer" data-total-entries="${postedCount}">
                <span>Mostrando <strong id="visible-transactions">${visibleCount}</strong> de <strong id="total-transactions">${postedCount}</strong> transacciones</span>
              </div>
            </section>
            <footer class="page-footer">
              <span>© ${new Date().getFullYear()} Atlas ERP</span
              ><span><i class="secure-dot"></i> Tus datos financieros están protegidos</span
              ><a href="#help">Centro de ayuda</a>
            </footer>
  `;
}

function bindDashboardInteractions() {
  if (dashboardInteractionsBound || typeof document === 'undefined') return;
  dashboardInteractionsBound = true;
  document.addEventListener('input', handleDashboardInput);
  document.addEventListener('click', handleDashboardDocumentClick);
  const dashboardView = document.querySelector('#view-dashboard');
  dashboardView?.addEventListener('click', handleDashboardViewClick, true);
}

function cleanupDashboardListeners() {
  if (typeof document === 'undefined') return;
  document.removeEventListener('click', handleDashboardDocumentClick);
  const dashboardView = document.querySelector('#view-dashboard');
  dashboardView?.removeEventListener('click', handleDashboardViewClick, true);
  dashboardInteractionsBound = false;
  closeRowMenu();
}

function handleDashboardInput(event) {
  if (!event.target.closest?.('#transaction-search')) return;
  const query = String(event.target.value || '')
    .trim()
    .toLocaleLowerCase('es');
  const rows = document.querySelectorAll('#transactions-body tr[data-search]');
  let visibleCount = 0;

  rows.forEach((row) => {
    const matches = String(row.dataset.search || '')
      .toLocaleLowerCase('es')
      .includes(query);
    row.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  updateTransactionFooter(visibleCount);
  const noResults = document.querySelector('#no-results');
  if (noResults) noResults.hidden = visibleCount !== 0;
}

function updateTransactionFooter(visibleCount) {
  const footer = document.querySelector('.table-footer');
  if (!footer) return;
  const total = Number(footer.dataset.totalEntries || 0);
  const visibleNode = footer.querySelector('#visible-transactions');
  const totalNode = footer.querySelector('#total-transactions');
  if (visibleNode) visibleNode.textContent = String(visibleCount);
  if (totalNode) totalNode.textContent = String(total);
}

function handleDashboardDocumentClick(event) {
  const periodMenu = document.querySelector('#period-menu');
  if (periodMenu && !periodMenu.hidden && !event.target.closest?.('.period-picker')) {
    periodMenu.hidden = true;
    document.querySelector('#period-picker-button')?.setAttribute('aria-expanded', 'false');
  }

  if (activeRowMenu && !event.target.closest?.('.row-action-menu') && !event.target.closest?.('.row-more')) {
    closeRowMenu();
  }
}

function handleDashboardViewClick(event) {
  if (event.target.closest?.('#export-button')) {
    event.preventDefault();
    event.stopPropagation();
    exportDashboardCsv();
    return;
  }

  const rowMore = event.target.closest?.('.row-more');
  if (rowMore) {
    event.preventDefault();
    event.stopPropagation();
    toggleRowMenu(rowMore);
    return;
  }

  const menuAction = event.target.closest?.('[data-row-action]');
  if (menuAction) {
    event.preventDefault();
    event.stopPropagation();
    handleRowMenuAction(menuAction);
    return;
  }

  if (event.target.closest?.('#period-picker-button')) {
    event.preventDefault();
    event.stopPropagation();
    togglePeriodMenu();
    return;
  }

  const option = event.target.closest?.('[data-period-option]');
  if (option) {
    event.preventDefault();
    event.stopPropagation();
    applyQuickPeriod(option.dataset.periodOption);
  }
}

function togglePeriodMenu() {
  const menu = document.querySelector('#period-menu');
  const button = document.querySelector('#period-picker-button');
  if (!menu || !button) return;
  const open = menu.hidden;
  menu.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
}

function applyQuickPeriod(option) {
  let period;

  if (option === 'active') {
    period = loadConfiguredPeriod();
    if (!period) {
      showToast('Configura un período activo en Configuración.');
      return;
    }
  } else if (option === 'month') {
    period = currentMonthPeriod();
  } else if (option === 'quarter') {
    period = currentQuarterPeriod();
  } else if (option === 'year-2026') {
    period = yearPeriod(2026);
  } else if (option === 'year-2025') {
    period = yearPeriod(2025);
  } else {
    return;
  }

  const result = saveActivePeriod(period);
  if (!result.success) {
    showToast(result.error || 'No se pudo actualizar el período.');
    return;
  }

  refreshDashboardMetrics();
  showToast(`Período actualizado: ${formatDate(period.desde)} — ${formatDate(period.hasta)}`);
}

function showToast(message) {
  if (typeof window === 'undefined') return;
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function closeRowMenu() {
  if (activeRowMenu?.element?.isConnected) {
    activeRowMenu.element.remove();
  }
  if (activeRowMenu?.cell?.isConnected) {
    activeRowMenu.cell.style.position = '';
    activeRowMenu.cell.style.zIndex = '';
  }
  const wrap = document.querySelector('#view-dashboard .table-wrap');
  if (wrap) wrap.style.overflow = '';
  activeRowMenu = null;
}

function toggleRowMenu(button) {
  const row = button.closest('tr[data-entry-id]');
  if (!row) return;
  const entryId = row.dataset.entryId;
  const doc = row.dataset.entryDoc || '';
  const same = activeRowMenu?.entryId === entryId;
  closeRowMenu();
  if (same) return;

  const cell = button.closest('td');
  const wrap = document.querySelector('#view-dashboard .table-wrap');
  if (!cell || !wrap) return;

  cell.style.position = 'relative';
  cell.style.zIndex = '40';
  wrap.style.overflow = 'visible';

  const menu = document.createElement('div');
  menu.className = 'row-action-menu';
  menu.setAttribute('role', 'menu');
  menu.style.cssText =
    'position:absolute;right:0;top:calc(100% + 4px);z-index:50;min-width:180px;padding:6px;border:1px solid #e6eaf0;border-radius:8px;background:#fff;box-shadow:0 12px 28px rgba(27,39,58,.16);display:flex;flex-direction:column;gap:2px;';
  menu.innerHTML = `
    <button type="button" role="menuitem" data-row-action="view" data-entry-id="${escapeHtml(entryId)}" style="display:block;width:100%;padding:8px 10px;border:0;border-radius:5px;background:transparent;color:#3b4758;font:500 12px 'DM Sans',sans-serif;text-align:left;cursor:pointer">Ver en Transacciones</button>
    <button type="button" role="menuitem" data-row-action="copy" data-entry-doc="${escapeHtml(doc)}" style="display:block;width:100%;padding:8px 10px;border:0;border-radius:5px;background:transparent;color:#3b4758;font:500 12px 'DM Sans',sans-serif;text-align:left;cursor:pointer">Copiar documento</button>
  `;
  cell.appendChild(menu);
  activeRowMenu = { entryId, element: menu, cell };
}

function handleRowMenuAction(action) {
  const type = action.dataset.rowAction;
  if (type === 'view') {
    closeRowMenu();
    navigateToTransactions();
    return;
  }
  if (type === 'copy') {
    const doc = action.dataset.entryDoc || '';
    copyDocument(doc);
  }
}

function navigateToTransactions() {
  const goButton = document.querySelector('#view-dashboard [data-go="transacciones"]');
  if (goButton) {
    goButton.click();
    return;
  }
  window.location.hash = '#transacciones';
}

function exportDashboardCsv() {
  const period = resolveActivePeriod(loadActivePeriod());
  const data = buildDashboardData(period);
  const periodLabel = `${formatDate(period.from)} — ${formatDate(period.to)}`;
  const departments = [...loadCollection('@erp-department-base').records, ...loadCollection('centros-costo').records];
  const rows = [];

  rows.push(['Resumen financiero']);
  rows.push(['Período activo', periodLabel]);
  rows.push([]);
  rows.push(['Indicadores KPI']);
  rows.push(['Indicador', 'Valor']);
  rows.push(['Ingresos totales', formatCurrency(data.metrics.ingresos)]);
  rows.push(['Gastos totales', formatCurrency(data.metrics.gastos)]);
  rows.push(['Resultado neto', formatCurrency(data.metrics.resultadoNeto)]);
  rows.push(['Saldo disponible', formatCurrency(data.saldoDisponible)]);
  rows.push(['Flujo de caja', formatCurrency(data.metrics.flujoCaja)]);
  rows.push([]);
  rows.push(['Asientos contabilizados del período activo']);
  rows.push(['Fecha', 'Descripción', 'Documento', 'Cuenta', 'Centro de costo', 'Estado', 'Importe']);

  data.entries.forEach((entry) => {
    const detalles = Array.isArray(entry.detalles) && entry.detalles.length ? entry.detalles : [{}];
    detalles.forEach((line) => {
      const account = data.accounts.find((item) => item.id === line.id_cuenta);
      const department = departments.find((item) => item.id === line.id_departamento);
      const amount = (Number(line.monto_debe) || 0) - (Number(line.monto_haber) || 0);
      rows.push([
        formatDate(entry.fecha_contable),
        entry.descripcion || 'Asiento contable',
        entry.numero_documento || entry.tipo_documento || entry.id || '',
        account?.nombre || '—',
        department?.nombre || '—',
        entry.estado || '',
        formatCurrency(amount),
      ]);
    });
  });

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'resumen-financiero.csv';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Descarga completada: resumen-financiero.csv');
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

async function copyDocument(doc) {
  const value = String(doc || '').trim();
  if (!value) {
    closeRowMenu();
    showToast('No hay documento para copiar.');
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    closeRowMenu();
    showToast(`Documento copiado: ${value}`);
  } catch {
    closeRowMenu();
    showToast('No se pudo copiar el documento.');
  }
}

export function refreshDashboardMetrics() {
  if (typeof document === 'undefined') return;
  cleanupDashboardListeners();
  const container = document.querySelector('#view-dashboard');
  if (container) {
    container.innerHTML = renderDashboard();
    return;
  }
  const fallbackHost = document.querySelector('#period-menu')?.closest('.period-toolbar')?.parentElement;
  if (fallbackHost) fallbackHost.innerHTML = renderDashboard();
}

export function buildDashboardData(period) {
  const accounts = loadCollection('accounts').records;
  const entries = filterEntries({
    fecha_desde: period.from,
    fecha_hasta: period.to,
    estado: POSTED_STATE,
  }).sort((left, right) => String(right.fecha_contable).localeCompare(String(left.fecha_contable)));
  const metrics = summarizeEntries(entries, accounts);

  const cashBalances = calculateCashBalances(entries, accounts);
  const saldoDisponible = cashBalances.reduce((sum, item) => sum + item.amount, 0);

  return {
    metrics,
    entries,
    accounts,
    cashBalances,
    saldoDisponible: +saldoDisponible.toFixed(4),
    monthly: buildMonthlySeries(period, accounts),
  };
}

function summarizeEntries(entries, accounts) {
  let ingresos = 0;
  let gastos = 0;
  let entradasEfectivo = 0;
  let salidasEfectivo = 0;

  for (const entry of entries) {
    for (const line of entry.detalles || []) {
      const account = accounts.find((item) => item.id === line.id_cuenta);
      if (!account) continue;

      const debe = Number(line.monto_debe) || 0;
      const haber = Number(line.monto_haber) || 0;

      if (account.tipo === 'Ingreso') ingresos += haber - debe;
      if (account.tipo === 'Gasto') gastos += debe - haber;

      if (isCashInflowAccount(account)) entradasEfectivo += debe;
      if (isCashOutflowAccount(account)) salidasEfectivo += haber;
    }
  }

  const resultadoNeto = ingresos - gastos;
  const flujoCaja = entradasEfectivo - salidasEfectivo;

  return {
    ingresos: +ingresos.toFixed(4),
    gastos: +gastos.toFixed(4),
    resultadoNeto: +resultadoNeto.toFixed(4),
    flujoCaja: +flujoCaja.toFixed(4),
    entradasEfectivo: +entradasEfectivo.toFixed(4),
    salidasEfectivo: +salidasEfectivo.toFixed(4),
  };
}

function isCashInflowAccount(account) {
  return account.es_efectivo === true;
}

function isCashOutflowAccount(account) {
  return account.es_efectivo === true;
}

function calculateCashBalances(entries, accounts) {
  const cashAccounts = accounts.filter((account) => account.es_efectivo === true);
  const balances = new Map(cashAccounts.map((account) => [account.id, { name: account.nombre, amount: 0 }]));

  for (const entry of entries) {
    for (const line of entry.detalles || []) {
      const balance = balances.get(line.id_cuenta);
      if (!balance) continue;
      balance.amount += (Number(line.monto_debe) || 0) - (Number(line.monto_haber) || 0);
    }
  }

  return Array.from(balances.values()).map((item) => ({ ...item, amount: +item.amount.toFixed(4) }));
}

function buildMonthlySeries(period, accounts) {
  const keys = listMonths(period);
  const firstKey = String(period.from).slice(0, 7);
  const lastKey = String(period.to).slice(0, 7);
  return keys.map((key) => {
    const from = key === firstKey ? period.from : `${key}-01`;
    const to = key === lastKey ? period.to : `${key}-${lastDayOfMonth(key)}`;
    const entries = filterEntries({
      fecha_desde: from,
      fecha_hasta: to,
      estado: POSTED_STATE,
    });
    const summary = summarizeEntries(entries, accounts);
    const label = new Intl.DateTimeFormat('es', { month: 'short' })
      .format(new Date(`${key}-01T00:00:00`))
      .replace('.', '');
    return { label, ingresos: summary.entradasEfectivo, gastos: summary.salidasEfectivo };
  });
}

function listMonths(period) {
  const start = new Date(`${String(period.from).slice(0, 7)}-01T00:00:00`);
  const end = new Date(`${String(period.to).slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const keys = [];
  while (start <= end && keys.length < VISIBLE_MONTHS) {
    keys.push(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`);
    start.setMonth(start.getMonth() + 1);
  }
  return keys;
}

function lastDayOfMonth(key) {
  const [year, month] = key.split('-').map(Number);
  return String(new Date(year, month, 0).getDate()).padStart(2, '0');
}

function resolveActivePeriod(storedPeriod) {
  if (
    storedPeriod &&
    isValidDate(storedPeriod.desde) &&
    isValidDate(storedPeriod.hasta) &&
    storedPeriod.desde <= storedPeriod.hasta
  ) {
    return { from: storedPeriod.desde, to: storedPeriod.hasta, modo: storedPeriod.modo };
  }
  return currentMonthPeriod();
}

function currentMonthPeriod() {
  const now = new Date();
  return monthPeriod(now.getFullYear(), now.getMonth());
}

function currentQuarterPeriod() {
  const now = new Date();
  return quarterPeriod(now.getFullYear(), now.getMonth());
}

function monthPeriod(year, monthIndex) {
  return {
    from: `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`,
    to: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(
      new Date(year, monthIndex + 1, 0).getDate(),
    ).padStart(2, '0')}`,
    modo: 'month',
  };
}

function quarterPeriod(year, monthIndex) {
  const firstMonth = Math.floor(monthIndex / 3) * 3;
  const endMonth = firstMonth + 2;
  return {
    from: `${year}-${String(firstMonth + 1).padStart(2, '0')}-01`,
    to: `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(new Date(year, endMonth + 1, 0).getDate()).padStart(
      2,
      '0',
    )}`,
    modo: 'quarter',
  };
}

function yearPeriod(year) {
  return { from: `${year}-01-01`, to: `${year}-12-31`, modo: 'year' };
}

function renderPeriodOption(value, label) {
  return `
    <button
      class="period-option"
      data-period-option="${value}"
      type="button"
      role="menuitem"
      style="display: block; width: 100%; padding: 8px 10px; border: 0; border-radius: 5px; background: transparent; color: #3b4758; font: 500 11px 'DM Sans', sans-serif; text-align: left; cursor: pointer"
    >${escapeHtml(label)}</button>
  `;
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function renderMetricCard(label, id, value, iconClass, iconPath) {
  return `
    <article class="metric-card">
      <div class="metric-top">
        <span class="metric-label">${escapeHtml(label)}</span
        ><span class="metric-icon ${iconClass}"
          ><svg viewBox="0 0 24 24">${iconPath}</svg
        ></span>
      </div>
      <div class="metric-value" id="${id}">${escapeHtml(formatCurrency(value))}</div>
      <div class="metric-foot"><span>${escapeHtml('Período activo')}</span></div>
    </article>
  `;
}

function renderAccountBreakdown(balances) {
  if (!balances.length) {
    return `<div class="account-row"><span class="account-name">Sin cuentas de efectivo configuradas</span><strong>${escapeHtml(
      formatCurrency(0),
    )}</strong></div>`;
  }
  const total = balances.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  return balances
    .map((item, index) => {
      const share = total > 0 ? Math.round((Math.abs(item.amount) / total) * 100) : 0;
      return `
        <div class="account-row">
          <span class="account-color ${['color-cash', 'color-receivable', 'color-other'][index % 3]}"></span
          ><span class="account-name">${escapeHtml(item.name || 'Cuenta de efectivo')}</span
          ><strong>${escapeHtml(formatCurrency(item.amount))}</strong><small>${share}%</small>
        </div>
      `;
    })
    .join('');
}

function renderAccountProgress(balances) {
  const total = balances.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const widths = balances.map((item) => (total > 0 ? (Math.abs(item.amount) / total) * 100 : 0));
  return widths.length
    ? widths.map((width) => `<i style="width: ${width}%"></i>`).join('')
    : '<i style="width: 0%"></i>';
}

function renderTransactionRows(entries, accounts) {
  const recent = entries.slice(0, 5);
  if (!recent.length) return '';

  const departments = [...loadCollection('@erp-department-base').records, ...loadCollection('centros-costo').records];

  return recent
    .map((entry) => {
      const firstLine = (entry.detalles || [])[0] || {};
      const account = accounts.find((item) => item.id === firstLine.id_cuenta);
      const department = departments.find((item) => item.id === firstLine.id_departamento);
      const total = (entry.detalles || []).reduce((sum, line) => sum + (Number(line.monto_debe) || 0), 0);
      const doc = entry.numero_documento || entry.tipo_documento || entry.id || '';
      const searchText = [
        entry.descripcion,
        entry.numero_documento,
        entry.tipo_documento,
        account?.nombre,
        department?.nombre,
        entry.estado,
      ]
        .filter(Boolean)
        .join(' ');

      return `
        <tr data-search="${escapeHtml(searchText.toLowerCase())}" data-entry-id="${escapeHtml(entry.id || '')}" data-entry-doc="${escapeHtml(doc)}">
          <td>
            <span class="transaction-icon ${total >= 0 ? 'transaction-income' : 'transaction-expense'}"
              ><svg viewBox="0 0 24 24"><path d="M12 19V5m-7 7 7-7 7 7" /></svg></span
            ><span class="transaction-main"
              ><strong>${escapeHtml(entry.descripcion || 'Asiento contable')}</strong
              ><small>${escapeHtml(doc)}</small></span
            >
          </td>
          <td>${escapeHtml(account?.nombre || '—')}</td>
          <td>${escapeHtml(formatDate(entry.fecha_contable))}</td>
          <td>${department ? escapeHtml(department.nombre) : '—'}</td>
          <td><span class="status-pill status-approved"><i></i>${escapeHtml(entry.estado)}</span></td>
          <td class="amount-col ${total >= 0 ? 'amount-positive' : 'amount-negative'}">${escapeHtml(
            formatCurrency(total),
          )}</td>
          <td><button class="row-more" type="button" aria-label="Acciones para ${escapeHtml(
            entry.descripcion || entry.id || 'asiento',
          )}" aria-haspopup="menu">···</button></td>
        </tr>
      `;
    })
    .join('');
}

function formatCurrency(value) {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sign = safeAmount < 0 ? '-' : '';
  return `${sign}$${Math.abs(safeAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompact(value) {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;
  if (safeAmount >= 1000) return `$${(safeAmount / 1000).toFixed(safeAmount % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(safeAmount)}`;
}

function formatDate(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function periodYears(period) {
  const fromYear = String(period.from).slice(0, 4);
  const toYear = String(period.to).slice(0, 4);
  return fromYear === toYear ? fromYear : `${fromYear}–${toYear}`;
}

function barHeight(value, max) {
  const amount = Number(value) || 0;
  return `${amount > 0 ? Math.max((amount / max) * 100, 4) : 0}%`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}

function bindRefresh() {
  if (refreshBound || typeof window === 'undefined') return;
  refreshBound = true;

  window.addEventListener('storage', (event) => {
    if (!event.key || event.key.startsWith('@erp') || event.key === 'finance-data') {
      refreshDashboardMetrics();
    }
  });
  window.addEventListener('pageshow', refreshDashboardMetrics);
  if (typeof document !== 'undefined') {
    document.addEventListener('finance:data-changed', refreshDashboardMetrics);
  }
}

export { POSTED_STATE };
export default renderDashboard;
