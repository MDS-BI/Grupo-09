import { loadCollection, saveCollection } from '../storage.js';
import { ENTRY_STATE } from '../domain/entry.js';
import { loadUsers } from '../domain/shared.js';
import { approveEntry as advanceEntry } from '../services/entry-service.js';
import { canApprove, isValidTransition } from '../services/approval-service.js';
import { reverseEntry } from '../services/reverse-service.js';
import { getPerEntryHistory, logEvent } from '../services/audit-service.js';

export const viewInfo = {
  title: 'Transacciones',
  breadcrumb: 'Transacciones',
  description: 'Administra y consulta los movimientos financieros de tu empresa.',
  action: 'Nueva transacción',
};

const APPROVAL_STEPS = [
  {
    action: 'submit',
    label: 'Enviar a revisión',
    from: ENTRY_STATE.BORRADOR,
    next: ENTRY_STATE.PENDIENTE,
  },
  {
    action: 'approve',
    label: 'Aprobar',
    from: ENTRY_STATE.PENDIENTE,
    next: ENTRY_STATE.APROBADA,
  },
  {
    action: 'post',
    label: 'Contabilizar',
    from: ENTRY_STATE.APROBADA,
    next: ENTRY_STATE.CONTABILIZADA,
  },
];

const EDIT_LOCKED_MESSAGE = 'Solo se pueden editar asientos en estado Borrador.';
const DELETE_LOCKED_MESSAGE = 'Solo se pueden eliminar asientos en estado Borrador.';
const LOCKED_ACTION_STYLE =
  'color: #aab3bf; background: #f2f4f7; border-color: #e6e9ee; opacity: 0.55; cursor: not-allowed;';
const VARIABLE_ACTIONS = ['toggle-details', 'submit', 'approve', 'post', 'reverse', 'edit', 'delete'];

let eventsBound = false;
let toastTimer;
const filters = { busqueda: '', estado: '' };

export function render() {
  bindEvents();

  const entries = loadCollection('entries').records
    .filter(Boolean)
    .slice()
    .sort((left, right) =>
      String(right.fecha_contable || '').localeCompare(String(left.fecha_contable || '')),
    );
  const accounts = loadCollection('accounts').records;
  const departments = [
    ...loadCollection('@erp-department-base').records,
    ...loadCollection('centros-costo').records,
  ];
  const user = getCurrentUser();
  const counts = countByState(entries);
  const filtered = entries.filter((entry) => matchesFilters(entry, filters));
  const noResultsHidden = filtered.length > 0 ? ' hidden' : '';
  const emptyMessage =
    entries.length === 0
      ? 'Aún no hay asientos registrados. Registre el primero para comenzar.'
      : 'No se encontraron asientos con los filtros aplicados.';

  return `
    <div class="transacciones-view" id="transacciones-view">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-line"></span> GESTIÓN CONTABLE</div>
          <h1>Transacciones</h1>
          <p class="subtitle">Asientos registrados en localStorage con aprobación secuencial e inmutabilidad.</p>
        </div>
        <div class="heading-actions">
          <button class="button button-primary" type="button" data-go="nueva-transaccion">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>Nueva transacción
          </button>
        </div>
      </div>

      <div class="period-toolbar">
        <div class="period-tabs" role="tablist" aria-label="Resumen por estado">
          ${renderStateCounts(counts)}
        </div>
        <span class="period-label"><span class="status-dot"></span>${entries.length} asientos en total</span>
      </div>

      <div class="empty-state-panel" data-role="feedback" role="status" aria-live="polite" style="margin-bottom: 14px;" hidden></div>

      <section class="panel transactions-panel">
        <div class="panel-heading transactions-heading">
          <div>
            <h2>Listado de asientos</h2>
            <p>Fecha, descripción, importe y estado de cada transacción</p>
          </div>
          <div class="table-actions">
            <label class="table-search"
              ><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg
              ><input
                id="entry-search"
                type="search"
                placeholder="Buscar asientos..."
                aria-label="Buscar asientos"
                value="${escapeHtml(filters.busqueda)}" /></label
            ><select id="entry-state-filter" aria-label="Filtrar por estado" class="button button-secondary button-compact" style="padding-right: 6px">
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
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>FECHA</th>
                <th>DESCRIPCIÓN</th>
                <th>LÍNEAS / MONTO TOTAL</th>
                <th>ESTADO</th>
                <th><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody id="entries-body">
              ${entries
                .map((entry) => renderEntryRow(entry, entries, accounts, departments, user))
                .join('')}
            </tbody>
          </table>
          <div class="no-results" id="no-results-entries"${noResultsHidden}>${escapeHtml(emptyMessage)}</div>
        </div>
        <div class="table-footer">
          <span>Mostrando <strong id="entries-count">${filtered.length}</strong> de <strong>${entries.length}</strong> asientos</span>
          <span class="period-label">Debe y Haber deben equilibrarse antes de contabilizar</span>
        </div>
      </section>
    </div>
  `;
}

export function refreshTransaccionesView() {
  if (typeof document === 'undefined') return;
  const root = document.querySelector('#transacciones-view');
  if (root) root.outerHTML = render();
}

export default render;

function bindEvents() {
  if (eventsBound || typeof document === 'undefined') return;
  eventsBound = true;

  document.addEventListener('click', (event) => {
    const goButton = event.target.closest('#transacciones-view [data-go]');
    if (goButton) {
      const nav = [...document.querySelectorAll('.nav-item')].find(
        (item) => item.dataset.view === goButton.dataset.go,
      );
      if (nav) nav.click();
      return;
    }

    const button = event.target.closest('#transacciones-view [data-action]');
    if (!button || button.disabled || !VARIABLE_ACTIONS.includes(button.dataset.action)) return;
    event.preventDefault();
    handleAction(button.dataset.action, button);
  });

  document.addEventListener('input', (event) => {
    if (!event.target.matches('#transacciones-view #entry-search')) return;
    filters.busqueda = event.target.value.trim().toLocaleLowerCase('es');
    applyTableFilters();
  });

  document.addEventListener('change', (event) => {
    if (!event.target.matches('#transacciones-view #entry-state-filter')) return;
    filters.estado = event.target.value;
    applyTableFilters();
  });

  window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith('@erp-envelope:entries')) refreshTransaccionesView();
  });
}

function handleAction(action, button) {
  const entryId = button.dataset.entryId;
  if (!entryId) return;

  if (action === 'toggle-details') {
    toggleDetails(button, entryId);
    return;
  }

  const entries = loadCollection('entries').records;
  const entry = entries.find((item) => item.id === entryId);
  if (!entry) {
    notify('No se encontró el asiento seleccionado.', true);
    return;
  }

  if (action === 'reverse') {
    reversePostedEntry(entry, entries);
    return;
  }

  if (action === 'edit') {
    if (entry.estado !== ENTRY_STATE.BORRADOR) {
      notify(EDIT_LOCKED_MESSAGE, true);
      return;
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('editingEntryId', entry.id);
    }
    const nav = [...document.querySelectorAll('.nav-item')].find(
      (item) => item.dataset.view === 'nueva-transaccion',
    );
    if (nav) nav.click();
    return;
  }

  if (action === 'delete') {
    deleteDraftEntry(entry);
    return;
  }

  transitionEntry(entry, action);
}

function transitionEntry(entry, action) {
  const step = APPROVAL_STEPS.find((item) => item.action === action);
  if (!step || entry.estado !== step.from || !isValidTransition(entry.estado, step.next)) {
    notify('Transición no permitida: el asiento no está en el estado esperado.', true);
    return;
  }

  const user = getCurrentUser();
  if (action !== 'submit' && !canApprove(user.role, entry.estado)) {
    notify('El usuario activo no tiene permiso para aprobar o contabilizar asientos.', true);
    return;
  }

  const prepared =
    action === 'post' ? { ...entry, id_usuario_contabilizador: user.id } : entry;
  const result = advanceEntry(prepared, action === 'submit' ? null : user.id);
  if (!result.success) {
    notify(result.error || 'No se pudo completar la transición.', true);
    return;
  }

  finishAction(`"${step.label}": el asiento pasó a estado ${result.entry.estado}.`);
}

function reversePostedEntry(entry, entries) {
  if (entry.estado !== ENTRY_STATE.CONTABILIZADA) {
    notify('Solo se pueden revertir asientos en estado Contabilizada.', true);
    return;
  }

  const existing = entries.find(
    (item) => item.id_transaccion_revertida === entry.id && item.id !== entry.id,
  );
  if (existing) {
    notify(`Ya existe una reversa para este asiento: ${existing.id}.`, true);
    return;
  }

  const result = reverseEntry(entry.id);
  if (!result.success) {
    notify(result.error || 'No se pudo revertir el asiento.', true);
    return;
  }

  finishAction(`Reversa ${result.reverseEntry.id} creada con Debe y Haber invertidos.`);
}

function deleteDraftEntry(entry) {
  if (entry.estado !== ENTRY_STATE.BORRADOR) {
    notify(DELETE_LOCKED_MESSAGE, true);
    return;
  }

  const remaining = loadCollection('entries').records.filter((item) => item.id !== entry.id);
  saveCollection('entries', remaining);
  logEvent({
    type: 'entry_delete',
    entityType: 'entry',
    entityId: entry.id,
    previousState: entry.estado,
    newState: null,
  });
  finishAction('Asiento eliminado correctamente.');
}

function finishAction(message, isError = false) {
  refreshTransaccionesView();
  notify(message, isError);
  if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
    document.dispatchEvent(new CustomEvent('finance:data-changed'));
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('refresh'));
}

function notify(message, isError = false) {
  if (typeof document === 'undefined') return;
  const feedback = document.querySelector('#transacciones-view [data-role="feedback"]');
  if (feedback) {
    feedback.textContent = message;
    feedback.hidden = !message;
    feedback.classList.toggle('is-error', Boolean(message && isError));
    feedback.style.cssText = message
      ? `margin-bottom: 14px; padding: 10px 12px; border: 1px solid ${isError ? '#f0d3cd' : '#cfe6db'}; border-left: 3px solid ${isError ? '#c76854' : '#21875f'}; border-radius: 8px; background: ${isError ? '#fff6f4' : '#f3faf6'}; color: ${isError ? '#9b4c3b' : '#1f6b4b'}; font-size: 11px;`
      : 'margin-bottom: 14px;';
  }

  const toast = document.querySelector('#toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

function toggleDetails(button, entryId) {
  const root = document.querySelector('#transacciones-view');
  if (!root) return;
  const detail = [...root.querySelectorAll('[data-detail-for]')].find(
    (row) => row.dataset.detailFor === entryId,
  );
  if (!detail) return;

  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  button.textContent = expanded ? 'Ver detalle' : 'Ocultar detalle';
  detail.hidden = expanded;
}

function applyTableFilters() {
  const root = document.querySelector('#transacciones-view');
  if (!root) return;

  let visible = 0;
  root.querySelectorAll('tr[data-entry-row]').forEach((row) => {
    const matches =
      (!filters.estado || row.dataset.estado === filters.estado) &&
      (!filters.busqueda || (row.dataset.search || '').includes(filters.busqueda));
    row.hidden = !matches;
    if (matches) visible += 1;
    const detail = [...root.querySelectorAll('[data-detail-for]')].find(
      (item) => item.dataset.detailFor === row.dataset.entryId,
    );
    if (detail) detail.hidden = true;
  });

  const counter = root.querySelector('#entries-count');
  if (counter) counter.textContent = String(visible);
  const noResults = root.querySelector('#no-results-entries');
  if (noResults) noResults.hidden = visible > 0;
}

function renderEntryRow(entry, entries, accounts, departments, user) {
  const lines = entry.detalles || [];
  const total = lines.reduce((sum, line) => sum + (Number(line.monto_debe) || 0), 0);
  const hasReverse = entries.some(
    (item) => item.id_transaccion_revertida === entry.id && item.id !== entry.id,
  );
  const lockedActions = entry.estado !== ENTRY_STATE.BORRADOR;
  const editDisabled = lockedActions
    ? ` disabled title="${EDIT_LOCKED_MESSAGE}" style="${LOCKED_ACTION_STYLE}"`
    : ' title="Editar asiento en estado Borrador"';
  const deleteDisabled = lockedActions
    ? ` disabled title="${DELETE_LOCKED_MESSAGE}" style="${LOCKED_ACTION_STYLE}"`
    : ' title="Eliminar asiento en estado Borrador"';
  const searchText = [
    entry.descripcion,
    entry.numero_documento,
    entry.tipo_documento,
    entry.estado,
    entry.id,
    ...lines.map((line) => accountName(accounts, line.id_cuenta)),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('es');
  const id = escapeHtml(entry.id || '');
  const detailId = `detalle-${id}`;

  return `
    <tr
      data-entry-row
      data-entry-id="${id}"
      data-estado="${escapeHtml(entry.estado)}"
      data-search="${escapeHtml(searchText)}"
      ${matchesFilters(entry, filters) ? '' : 'hidden'}
    >
      <td>${escapeHtml(formatDate(entry.fecha_contable))}</td>
      <td>
        <span class="transaction-main"
          ><strong>${escapeHtml(entry.descripcion || 'Asiento contable')}</strong
          ><small>${escapeHtml([entry.tipo_documento, entry.numero_documento].filter(Boolean).join(' · ') || entry.id || '')}</small></span
        >
      </td>
      <td>
        <span class="amount-col amount-positive" data-amount="${total}">${escapeHtml(formatCurrency(total))}</span>
        <small style="display: block; color: #9aa4b1;">${lines.length} ${lines.length === 1 ? 'línea' : 'líneas'}</small>
      </td>
      <td>${renderStatePill(entry.estado)}</td>
      <td>
        <div style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-end;">
          <button class="button button-secondary button-compact" type="button" data-action="toggle-details" data-entry-id="${id}" aria-expanded="false" aria-controls="${detailId}">Ver detalle</button>
          ${renderStepButtons(entry, user.role)}
          <button class="button button-secondary button-compact" type="button" data-action="edit" data-entry-id="${id}"${editDisabled}>Editar</button>
          <button class="button button-secondary button-compact" type="button" data-action="delete" data-entry-id="${id}"${deleteDisabled}>Eliminar</button>
          <button class="button ${entry.estado === ENTRY_STATE.CONTABILIZADA && !hasReverse ? 'button-primary' : 'button-secondary'} button-compact" type="button" data-action="reverse" data-entry-id="${id}"${entry.estado === ENTRY_STATE.CONTABILIZADA && !hasReverse ? '' : ` disabled title="${hasReverse ? 'Ya existe una reversa para este asiento' : 'Solo se pueden revertir asientos contabilizados'}"`}>Revertir</button>
        </div>
      </td>
    </tr>
    <tr data-detail-for="${id}" hidden>
      <td colspan="5" style="padding: 0 17px 16px; white-space: normal;">
        ${renderEntryDetail(entry, accounts, departments)}
      </td>
    </tr>
  `;
}

function renderStepButtons(entry, role) {
  return APPROVAL_STEPS.map((step) => {
    const allowed =
      entry.estado === step.from &&
      isValidTransition(entry.estado, step.next) &&
      (step.action === 'submit' || canApprove(role, entry.estado));
    const reason =
      step.action !== 'submit' && !canApprove(role, entry.estado)
        ? 'Sin permiso de aprobación'
        : `Solo válido desde el estado ${step.from}`;
    return `<button class="button ${allowed ? 'button-primary' : 'button-secondary'} button-compact" type="button" data-action="${step.action}" data-entry-id="${escapeHtml(entry.id || '')}"${allowed ? '' : ` disabled title="${escapeHtml(reason)}"`}>${escapeHtml(step.label)}</button>`;
  }).join('');
}

function renderEntryDetail(entry, accounts, departments) {
  const lines = entry.detalles || [];
  const debe = lines.reduce((sum, line) => sum + (Number(line.monto_debe) || 0), 0);
  const haber = lines.reduce((sum, line) => sum + (Number(line.monto_haber) || 0), 0);
  const history = getPerEntryHistory(entry.id).slice(0, 8);

  return `
    <div style="border: 1px solid #e8ecf2; border-radius: 8px; padding: 12px 14px; background: #fafbfd;">
      <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <strong style="color: #344054; font-size: 11px;">Detalle de líneas (Debe / Haber)</strong>
        <span style="color: #697689; font-size: 10px;">Debe ${escapeHtml(formatCurrency(debe))} · Haber ${escapeHtml(formatCurrency(haber))}</span>
      </div>
      <table style="background: #fff; border: 1px solid #eef0f4; border-radius: 6px;">
        <thead>
          <tr>
            <th>LÍNEA</th>
            <th>CUENTA</th>
            <th>CENTRO DE COSTO</th>
            <th>GLOSA</th>
            <th class="amount-col">DEBE</th>
            <th class="amount-col">HABER</th>
          </tr>
        </thead>
        <tbody>
          ${
            lines.length
              ? lines
                  .map(
                    (line) => `
              <tr>
                <td>${escapeHtml(line.numero_linea ?? '—')}</td>
                <td>${escapeHtml(accountName(accounts, line.id_cuenta))}</td>
                <td>${escapeHtml(departmentName(departments, line.id_departamento))}</td>
                <td>${escapeHtml(line.glosa || '—')}</td>
                <td class="amount-col">${Number(line.monto_debe) > 0 ? escapeHtml(formatCurrency(line.monto_debe)) : '—'}</td>
                <td class="amount-col">${Number(line.monto_haber) > 0 ? escapeHtml(formatCurrency(line.monto_haber)) : '—'}</td>
              </tr>
            `,
                  )
                  .join('')
              : '<tr><td colspan="6" class="no-results">Este asiento no tiene líneas registradas.</td></tr>'
          }
        </tbody>
      </table>
      ${
        entry.id_transaccion_revertida
          ? `<p style="margin: 10px 0 0; color: #697689; font-size: 10px;">Asiento relacionado: <strong>${escapeHtml(entry.id_transaccion_revertida)}</strong></p>`
          : ''
      }
      <div style="margin-top: 12px;">
        <strong style="color: #344054; font-size: 10px;">Historial de cambios de estado</strong>
        <ul style="margin: 6px 0 0; padding-left: 16px; color: #8792a2; font-size: 10px; line-height: 1.7;">
          ${
            history.length
              ? history
                  .map((event) => {
                    const actor = event.metadata?.approverId || event.metadata?.actorId || '—';
                    return `<li>${escapeHtml(formatDateTime(event.timestamp))} · ${escapeHtml(event.type)} · ${escapeHtml(event.previousState || '—')} → ${escapeHtml(event.newState || '—')} · ${escapeHtml(actor)}</li>`;
                  })
                  .join('')
              : '<li>Sin cambios registrados.</li>'
          }
        </ul>
      </div>
    </div>
  `;
}

function renderStateCounts(counts) {
  return Object.values(ENTRY_STATE)
    .map(
      (state) =>
        `<span class="period-tab" role="tab" aria-selected="false" title="${escapeHtml(state)}">${escapeHtml(state)} <strong>${counts[state] || 0}</strong></span>`,
    )
    .join('');
}

function renderStatePill(state) {
  const validated = Object.values(ENTRY_STATE).includes(state) ? state : ENTRY_STATE.BORRADOR;
  const style =
    validated === ENTRY_STATE.REVERTIDA
      ? 'background: #eef0f4; color: #697689;'
      : validated === ENTRY_STATE.CONTABILIZADA || validated === ENTRY_STATE.APROBADA
        ? ''
        : 'background: #fff5e8; color: #b67a2d;';
  return `<span class="status-pill ${validated === ENTRY_STATE.CONTABILIZADA || validated === ENTRY_STATE.APROBADA ? 'status-approved' : 'status-pending'}" style="${style}"><i></i>${escapeHtml(validated)}</span>`;
}

function countByState(entries) {
  return entries.reduce((counts, entry) => {
    counts[entry.estado] = (counts[entry.estado] || 0) + 1;
    return counts;
  }, {});
}

function matchesFilters(entry, currentFilters) {
  if (currentFilters.estado && entry.estado !== currentFilters.estado) return false;
  if (!currentFilters.busqueda) return true;
  const searchText = [
    entry.descripcion,
    entry.numero_documento,
    entry.tipo_documento,
    entry.estado,
    entry.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('es');
  return searchText.includes(currentFilters.busqueda);
}

function getCurrentUser() {
  const users = loadUsers().filter(Boolean);
  return (
    users.find((user) => user.role === 'admin') ||
    users[0] ||
    { id: 'user-1', role: 'admin', name: 'Camila Méndez' }
  );
}

function accountName(accounts, accountId) {
  const account = accounts.find((item) => item.id === accountId || item._id === accountId);
  return account ? `${account.codigo || ''} ${account.nombre || ''}`.trim() : accountId || '—';
}

function departmentName(departments, departmentId) {
  if (!departmentId) return 'Sin departamento';
  const department = departments.find(
    (item) => item.id === departmentId || item._id === departmentId,
  );
  return department ? department.nombre || department.id : departmentId;
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
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
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
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}
