import { ensureSeedData } from './utils/seed.js';
import { loadCollection } from './storage.js';
import {
  LEGACY_SESSION_KEY,
  SESSION_KEY,
  getCurrentUser,
  getAvailableProfiles,
  hasAccess,
  login,
  logout,
} from './services/auth-service.js';
import { renderLoginScreen } from './views/login.js';
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

const RESTRICTED_MESSAGE = 'Tu perfil no tiene acceso a ese módulo.';
const navItems = [...document.querySelectorAll('.nav-item')];
const dashboardView = document.querySelector('#view-dashboard');
const placeholderView = document.querySelector('#view-placeholder');
const toast = document.querySelector('#toast');
const loginRoot = document.querySelector('#login-root');
const appShell = document.querySelector('.app-shell');
const adminCaption = document.querySelector('.nav-caption-lower');
const profileButton = document.querySelector('#profile-button');
const topbarProfile = document.querySelector('#topbar-profile');
let currentUser = getCurrentUser();
let currentView = null;
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

function readHashView() {
  const raw = String(window.location.hash || '').replace(/^#\/?/, '');
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function updateTransactionCount() {
  const badge = document.querySelector('.nav-item[data-view="transacciones"] .nav-count');
  if (!badge) return;
  badge.textContent = String(loadCollection('entries').records.length);
}

function applyRoleRestrictions(user) {
  navItems.forEach((item) => {
    const allowed = Boolean(user) && hasAccess(item.dataset.view, user);
    item.hidden = !allowed;
    item.setAttribute('aria-hidden', String(!allowed));
    item.classList.toggle('active', allowed && normalizeView(item.dataset.view) === currentView);
    if (!allowed) item.removeAttribute('aria-current');
  });
  if (adminCaption) adminCaption.hidden = !user || !hasAccess('auditoria', user);
}

function updateProfile(user) {
  const name = user?.name || 'Sin sesión activa';
  const role = user?.roleLabel || 'Perfil no autenticado';
  const initials = user?.initials || 'AT';

  const bindings = [
    ['#profile-name', name],
    ['#profile-role', role],
    ['#profile-action', user ? 'Cerrar sesión / Cambiar usuario' : 'Inicia sesión para continuar'],
    ['#profile-avatar', initials],
    ['#topbar-avatar', initials],
  ];
  bindings.forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  });
  if (profileButton) profileButton.disabled = !user;
  if (topbarProfile) topbarProfile.disabled = !user;
}

function renderView(route) {
  const info = views[route];
  const isDashboard = route === 'dashboard';

  if (dashboardView) dashboardView.innerHTML = '';
  if (placeholderView) placeholderView.innerHTML = '';
  if (dashboardView) dashboardView.hidden = !isDashboard;
  if (placeholderView) placeholderView.hidden = isDashboard;

  const activeView = isDashboard ? dashboardView : placeholderView;
  if (activeView) activeView.innerHTML = info.render();

  currentView = route;
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

function navigate(view, { updateHash = true } = {}) {
  if (!currentUser) return;
  const requested = normalizeView(view);
  const route = hasAccess(requested, currentUser) ? requested : 'dashboard';
  if (route !== requested) showToast(RESTRICTED_MESSAGE);

  const nextHash = `#/${route}`;
  if (updateHash && window.location.hash !== nextHash) {
    window.location.hash = nextHash;
    return;
  }

  renderView(route);
}

function showLogin() {
  if (!loginRoot) return;
  loginRoot.innerHTML = renderLoginScreen(getAvailableProfiles());
  loginRoot.hidden = false;
  document.body.classList.add('login-required');
  appShell?.setAttribute('aria-hidden', 'true');
  loginRoot.querySelector('#login-password')?.focus();
}

function hideLogin() {
  if (!loginRoot) return;
  loginRoot.hidden = true;
  loginRoot.innerHTML = '';
  document.body.classList.remove('login-required');
  appShell?.removeAttribute('aria-hidden');
}

function syncSession(user) {
  currentUser = user || null;
  applyRoleRestrictions(currentUser);
  updateProfile(currentUser);
  if (currentUser) {
    hideLogin();
    navigate(readHashView() || 'dashboard');
  } else {
    showLogin();
  }
}

loginRoot?.addEventListener('click', (event) => {
  const card = event.target.closest('.login-profile[data-user-id]');
  if (!card || !loginRoot.contains(card)) return;
  const password = loginRoot.querySelector('#login-password')?.value ?? '';
  const result = login(card.dataset.userId, password);
  if (!result.success) {
    const error = loginRoot.querySelector('#login-error');
    if (error) {
      error.textContent = result.error;
      error.hidden = false;
    }
  }
});

document.addEventListener('auth:changed', (event) => syncSession(event.detail?.user ?? null));

profileButton?.addEventListener('click', () => logout());
topbarProfile?.addEventListener('click', () => logout());

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

const sidebarToggle = document.querySelector('#sidebar-toggle');
const narrowQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 980px)') : null;

function isNarrowViewport() {
  if (narrowQuery) return narrowQuery.matches;
  return window.innerWidth <= 980;
}

function syncSidebarToggle() {
  if (!sidebarToggle) return;
  const collapsed = document.body.classList.contains('sidebar-collapsed');
  sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  sidebarToggle.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Contraer menú');
}

sidebarToggle?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  document.body.classList.toggle('sidebar-collapsed');
  syncSidebarToggle();
});

let narrowViewport = isNarrowViewport();
if (narrowViewport) document.body.classList.add('sidebar-collapsed');
syncSidebarToggle();

window.addEventListener('resize', () => {
  const nextNarrow = isNarrowViewport();
  if (nextNarrow && !narrowViewport) document.body.classList.add('sidebar-collapsed');
  narrowViewport = nextNarrow;
  syncSidebarToggle();
});

window.addEventListener('hashchange', () => {
  if (!currentUser) return;
  navigate(readHashView() || 'dashboard', { updateHash: false });
});

window.addEventListener('storage', (event) => {
  if (event.key === SESSION_KEY || event.key === LEGACY_SESSION_KEY) {
    syncSession(getCurrentUser());
  }
  if (!event.key || event.key.startsWith('@erp') || event.key === 'finance-data') {
    updateTransactionCount();
  }
});
window.addEventListener('pageshow', updateTransactionCount);
document.addEventListener('finance:data-changed', updateTransactionCount);

ensureSeedData();
currentUser = getCurrentUser();
applyRoleRestrictions(currentUser);
updateProfile(currentUser);
if (currentUser) {
  hideLogin();
  navigate(readHashView() || 'dashboard', { updateHash: false });
} else {
  showLogin();
}
