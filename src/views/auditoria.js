import { loadUsers } from '../domain/shared.js';
import { getEvents } from '../services/audit-service.js';

export const viewInfo = {
  title: 'Registro de auditoría',
  breadcrumb: 'Auditoría',
  description: 'Rastrea el origen, la fecha y el autor de cada movimiento financiero.',
  action: 'Ver registros',
};

const ACTION_LABELS = {
  entry_creation: 'Creación de asiento',
  entry_create: 'Creación de asiento',
  create: 'Creación',
  entry_update: 'Edición de asiento',
  entry_edit: 'Edición de asiento',
  entry_delete: 'Eliminación de asiento',
  update: 'Edición',
  submit: 'Envío a revisión',
  entry_submit: 'Envío a revisión',
  approve: 'Aprobación',
  approval: 'Aprobación',
  post: 'Contabilización',
  posting: 'Contabilización',
  reverse: 'Reversa',
  reversal: 'Reversa',
  account_create: 'Creación de cuenta contable',
  account_update: 'Edición de cuenta contable',
  account_edit: 'Edición de cuenta contable',
  account_deactivate: 'Desactivación de cuenta contable',
  account_reactivate: 'Reactivación de cuenta contable',
  settings_update: 'Cambio de configuración',
  config_update: 'Cambio de configuración',
};

const ENTITY_LABELS = {
  entry: 'Asiento',
  account: 'Cuenta contable',
  cost_center: 'Centro de costo',
  settings: 'Configuración',
  user: 'Usuario',
  department: 'Departamento',
};

export function render(events) {
  const records = Array.isArray(events) ? sortEvents(events) : loadEvents();
  const users = loadUsers().filter(Boolean);
  const activeUser = getCurrentUser(users);

  return `
    <section class="audit-view" id="audit-view" aria-label="Bitácora de auditoría">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-line"></span> TRAZABILIDAD</div>
          <h1>Registro de auditoría</h1>
          <p class="subtitle">Bitácora cronológica de las acciones críticas del módulo.</p>
        </div>
        <div class="heading-actions">
          <span class="period-label">Usuario activo: <strong>${escapeHtml(userLabel(activeUser))}</strong></span>
          <span class="period-label"><span class="status-dot"></span>${records.length} eventos registrados</span>
        </div>
      </div>

      <section class="panel audit-panel">
        <div class="panel-heading">
          <div>
            <h2>Bitácora de eventos</h2>
            <p>Consulta de solo lectura: los eventos no pueden editarse ni eliminarse.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>FECHA Y HORA</th>
                <th>ACCIÓN</th>
                <th>ENTIDAD AFECTADA</th>
                <th>USUARIO</th>
                <th>DETALLE</th>
              </tr>
            </thead>
            <tbody id="audit-events-body">
              ${records.map((event) => renderEventRow(event, users, activeUser)).join('')}
            </tbody>
          </table>
          <div class="no-results" id="audit-no-results"${records.length ? ' hidden' : ''}>
            No hay eventos de auditoría registrados todavía.
          </div>
        </div>
        <div class="table-footer">
          <span>Mostrando <strong>${records.length}</strong> eventos en orden cronológico</span>
          <span class="period-label">Registro inmutable · Solo lectura</span>
        </div>
      </section>
    </section>
  `;
}

export function getAuditEvents() {
  return loadEvents();
}

export function renderAuditoria() {
  return render();
}

export default render;

function loadEvents() {
  try {
    const events = getEvents();
    if (events.length) return sortEvents(events);
  } catch {
    return readAuditEnvelope();
  }
  return readAuditEnvelope();
}

function readAuditEnvelope() {
  try {
    const raw = localStorage.getItem('@erp-envelope:audit-log');
    const parsed = raw ? JSON.parse(raw) : null;
    return sortEvents(Array.isArray(parsed?.records) ? parsed.records : []);
  } catch {
    return [];
  }
}

function sortEvents(events) {
  return events.slice().sort((left, right) => {
    const first = new Date(left.timestamp || left._timestamp || 0).getTime();
    const second = new Date(right.timestamp || right._timestamp || 0).getTime();
    return first - second;
  });
}

function renderEventRow(event, users, activeUser) {
  const timestamp = event.timestamp || event._timestamp || '';
  const type = String(event.type || event.accion || 'evento');
  const label = ACTION_LABELS[type] || prettify(type);
  const entityType = ENTITY_LABELS[event.entityType] || prettify(String(event.entityType || 'entidad'));
  const entityId = event.entityId || event.id_entidad || '—';
  const user = resolveUser(event, users, activeUser);
  const detail = renderDetail(event);

  return `
    <tr data-event-type="${escapeHtml(type)}" data-timestamp="${escapeHtml(timestamp)}" data-entity-id="${escapeHtml(entityId)}">
      <td>
        <time datetime="${escapeHtml(timestamp)}" title="${escapeHtml(timestamp)}">${escapeHtml(formatDateTime(timestamp))}</time>
        <small style="display: block; color: #8792a2">${escapeHtml(timestamp || '—')}</small>
      </td>
      <td>
        <span class="status-pill status-approved"><i></i>${escapeHtml(label)}</span>
        <small style="display: block; color: #8792a2">${escapeHtml(type)}</small>
      </td>
      <td>
        <strong>${escapeHtml(entityType)}</strong>
        <small style="display: block; color: #8792a2">${escapeHtml(entityId)}</small>
      </td>
      <td>
        ${escapeHtml(userLabel(user))}
        <small style="display: block; color: #8792a2">${escapeHtml(user?.id || user?._id || 'Sistema')}</small>
      </td>
      <td style="white-space: normal">${detail}</td>
    </tr>
  `;
}

function renderDetail(event) {
  const parts = [];
  if (event.previousState) parts.push(`De ${event.previousState}`);
  if (event.newState) parts.push(`a ${event.newState}`);
  const metadata = event.metadata || {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (['userId', 'approverId', 'actorId'].includes(key)) return;
    parts.push(`${prettify(key)}: ${value}`);
  });
  return parts.length
    ? escapeHtml(parts.join(' · '))
    : '<span style="color: #8792a2">Sin detalles adicionales</span>';
}

function resolveUser(event, users, activeUser) {
  const metadata = event.metadata || {};
  const id =
    metadata.userId ||
    metadata.approverId ||
    metadata.actorId ||
    event.userId ||
    event.id_usuario ||
    event.actorId ||
    event.usuario;
  if (id) {
    return users.find((user) => user.id === id || user._id === id) || { id, name: id };
  }
  return activeUser;
}

function getCurrentUser(users) {
  const sessionKeys = [
    '@erp-active-user',
    '@erp-current-user',
    '@erp-session',
    'activeUser',
    'usuarioActivo',
  ];
  for (const key of sessionKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    let value = raw;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
    const id = typeof value === 'string' ? value : value?.id || value?.userId || value?.user?.id;
    const match = users.find((user) => user.id === id || user._id === id);
    if (match) return match;
    if (id) return { id, name: id };
  }
  return users.find((user) => user.role === 'admin') || users[0] || { id: 'user-1', name: 'Administrador' };
}

function userLabel(user) {
  if (!user) return 'Sistema';
  return user.name || user.nombre || user.id || user._id || 'Sistema';
}

function prettify(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}
