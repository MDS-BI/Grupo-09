const sectionInfo = {
  dashboard: { title: 'Panel general', breadcrumb: 'Panel general' },
  transactions: { title: 'Transacciones', breadcrumb: 'Transacciones', description: 'Administra y consulta los movimientos financieros de tu empresa.', action: 'Nueva transacción' },
  accounts: { title: 'Plan de cuentas', breadcrumb: 'Plan de cuentas', description: 'Organiza las cuentas contables y consulta su clasificación financiera.', action: 'Nueva cuenta contable' },
  'cost-centers': { title: 'Centros de costo', breadcrumb: 'Centros de costo', description: 'Controla presupuestos y analiza gastos por departamento.', action: 'Nuevo centro de costo' },
  reports: { title: 'Reportes financieros', breadcrumb: 'Reportes', description: 'Consulta el estado de resultados y el flujo de caja de tu empresa.', action: 'Generar reporte' },
  audit: { title: 'Registro de auditoría', breadcrumb: 'Auditoría', description: 'Rastrea el origen, la fecha y el autor de cada movimiento financiero.', action: 'Ver registros' },
  settings: { title: 'Configuración', breadcrumb: 'Configuración', description: 'Administra las preferencias del período contable y las finanzas.', action: 'Guardar cambios' }
};

const navItems = [...document.querySelectorAll('.nav-item')];
const dashboardView = document.querySelector('#view-dashboard');
const placeholderView = document.querySelector('#view-placeholder');
const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function navigate(view) {
  const details = sectionInfo[view] ?? sectionInfo.dashboard;
  const isDashboard = view === 'dashboard';
  dashboardView.hidden = !isDashboard;
  placeholderView.hidden = isDashboard;
  document.querySelector('#breadcrumb-current').textContent = details.breadcrumb;
  if (!isDashboard) {
    document.querySelector('#placeholder-title').textContent = details.title;
    document.querySelector('#placeholder-description').textContent = details.description;
    document.querySelector('#placeholder-action').lastChild.textContent = details.action;
  }
  navItems.forEach((item) => {
    const active = item.dataset.view === view;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  document.querySelector('.main-content').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

navItems.forEach((item) => item.addEventListener('click', () => navigate(item.dataset.view)));
document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.go)));
document.querySelector('#new-transaction').addEventListener('click', () => showToast('Formulario de nueva transacción listo para conectar.'));
document.querySelector('#placeholder-action').addEventListener('click', () => showToast('Esta acción estará disponible al conectar los datos del módulo.'));
document.querySelector('#export-button').addEventListener('click', () => showToast('Preparando exportación del resumen financiero…'));
document.querySelector('#sidebar-toggle').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
  const collapsed = document.body.classList.contains('sidebar-collapsed');
  document.querySelector('#sidebar-toggle').setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Contraer menú');
});

document.querySelectorAll('.period-tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.period-tab').forEach((item) => item.classList.toggle('selected', item === tab));
}));

document.querySelector('#transaction-search').addEventListener('input', (event) => {
  const query = event.target.value.trim().toLocaleLowerCase('es');
  const rows = [...document.querySelectorAll('#transactions-body tr')];
  let visibleCount = 0;
  rows.forEach((row) => {
    const matches = row.dataset.search.toLocaleLowerCase('es').includes(query);
    row.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  document.querySelector('#no-results').hidden = visibleCount !== 0;
});

document.querySelectorAll('.row-more').forEach((button) => button.addEventListener('click', () => showToast(`Opciones de ${button.getAttribute('aria-label').replace('Acciones para ', '')}`)));
