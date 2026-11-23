import { ensureSeedData } from './utils/seed.js';
import { loadCollection } from './storage.js';
import { renderDashboard } from './views/dashboard.js';
import { render as renderConfiguracion, viewInfo as configuracionInfo } from './views/configuracion.js';
import { render as renderPlanCuentas, viewInfo as planCuentasInfo } from './views/plan-cuentas.js';
import { render as renderNuevaTransaccion, viewInfo as nuevaTransaccionInfo } from './views/nueva-transaccion.js';
import { render as renderTransacciones, viewInfo as transaccionesInfo } from './views/transacciones.js';
import { render as renderConsulta, viewInfo as consultaInfo } from './views/consulta.js';
import { render as renderAuditoria, viewInfo as auditoriaInfo } from './views/auditoria.js';
import { render as renderCentrosCosto, viewInfo as centrosCostoInfo } from './views/centros-costo.js';
import { render as renderReportes, viewInfo as reportesInfo } from './views/reportes.js';

const views = {
  dashboard: {
    title: 'Panel general',
    breadcrumb: 'Panel general',
    render: renderDashboard,
  },
  configuracion: { ...configuracionInfo, render: renderConfiguracion },
  'plan-cuentas': { ...planCuentasInfo, render: renderPlanCuentas },
  'nueva-transaccion': { ...nuevaTransaccionInfo, render: renderNuevaTransaccion },
  transacciones: { ...transaccionesInfo, render: renderTransacciones },
  consulta: { ...consultaInfo, render: renderConsulta },
  auditoria: { ...auditoriaInfo, render: renderAuditoria },
  'centros-costo': { ...centrosCostoInfo, render: renderCentrosCosto },
  reportes: { ...reportesInfo, render: renderReportes },
};

const viewAliases = {
  accounts: 'plan-cuentas',
  entries: 'transacciones',
  transactions: 'transacciones',
  query: 'consulta',
  'cost-centers': 'centros-costo',
  reports: 'reportes',
  audit: 'auditoria',
  settings: 'configuracion',
};

const navItems = [...document.querySelectorAll('.nav-item')];
const dashboardView = document.querySelector('#view-dashboard');
const placeholderView = document.querySelector('#view-placeholder');
const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function normalizeView(view) {
  if (views[view]) return view;
  return viewAliases[view] ?? 'dashboard';
}

function updateTransactionCount() {
  const badge = document.querySelector('.nav-item[data-view="transacciones"] .nav-count');
  if (!badge) return;
  badge.textContent = String(loadCollection('entries').records.length);
}

function navigate(view) {
  const route = normalizeView(view);
  const info = views[route];
  const isDashboard = route === 'dashboard';

  dashboardView.innerHTML = '';
  placeholderView.innerHTML = '';
  dashboardView.hidden = !isDashboard;
  placeholderView.hidden = isDashboard;

  const activeView = isDashboard ? dashboardView : placeholderView;
  activeView.innerHTML = info.render();

  updateTransactionCount();

  const breadcrumb = document.querySelector('#breadcrumb-current');
  if (breadcrumb) breadcrumb.textContent = info.breadcrumb;

  navItems.forEach((item) => {
    const active = normalizeView(item.dataset.view) === route;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });

  document.querySelector('.main-content')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
}

dashboardView?.addEventListener('click', (event) => {
  const goButton = event.target.closest('[data-go]');
  if (goButton) {
    navigate(goButton.dataset.go);
    return;
  }
  if (event.target.closest('#new-transaction')) {
    navigate('nueva-transaccion');
    return;
  }
  if (event.target.closest('#export-button')) {
    showToast('Preparando exportación del resumen financiero…');
    return;
  }

  const periodTab = event.target.closest('.period-tab');
  if (periodTab) {
    dashboardView.querySelectorAll('.period-tab').forEach((item) => item.classList.toggle('selected', item === periodTab));
    return;
  }

  const rowMore = event.target.closest('.row-more');
  if (rowMore) {
    showToast(`Opciones de ${rowMore.getAttribute('aria-label').replace('Acciones para ', '')}`);
  }
});

dashboardView?.addEventListener('input', (event) => {
  if (!event.target.closest('#transaction-search')) return;
  const query = event.target.value.trim().toLocaleLowerCase('es');
  let visibleCount = 0;
  dashboardView.querySelectorAll('#transactions-body tr').forEach((row) => {
    const matches = row.dataset.search.toLocaleLowerCase('es').includes(query);
    row.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  const noResults = dashboardView.querySelector('#no-results');
  if (noResults) noResults.hidden = visibleCount !== 0;
});

placeholderView?.addEventListener('click', (event) => {
  if (event.target.closest('#placeholder-action')) {
    showToast('Esta acción estará disponible al conectar los datos del módulo.');
  }
});

navItems.forEach((item) => item.addEventListener('click', () => navigate(item.dataset.view)));

document.querySelector('#sidebar-toggle')?.addEventListener('click', (event) => {
  document.body.classList.toggle('sidebar-collapsed');
  const collapsed = document.body.classList.contains('sidebar-collapsed');
  event.currentTarget.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Contraer menú');
});

window.addEventListener('storage', (event) => {
  if (!event.key || event.key.startsWith('@erp') || event.key === 'finance-data') {
    updateTransactionCount();
  }
});
window.addEventListener('pageshow', updateTransactionCount);
document.addEventListener('finance:data-changed', updateTransactionCount);

ensureSeedData();
navigate('dashboard');
