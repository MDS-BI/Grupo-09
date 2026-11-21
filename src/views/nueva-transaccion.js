import { loadCollection } from '../storage.js';
import { loadDepartments, loadUsers } from '../domain/shared.js';
import { ENTRY_STATE } from '../domain/entry.js';
import { saveEntry } from '../services/entry-service.js';
import { PRECISION } from '../utils/money.js';

export const viewInfo = {
  title: 'Nueva transacción',
  breadcrumb: 'Nueva transacción',
  description: 'Registra asientos contables con partida doble y trazabilidad completa.',
  action: 'Guardar transacción',
};

const SCALE = 10 ** PRECISION;
const MIN_LINES = 2;
const MAX_LINES = 50;

let listenersBound = false;
let lines = [];
let nextLineId = 1;
let submitAttempted = false;
let toastTimer;

export function render() {
  ensureListeners();
  resetDraft();

  return `
    <section class="nueva-transaccion-view" id="nueva-transaccion-view">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-line"></span> REGISTRO CONTABLE</div>
          <h1>Nueva transacción</h1>
          <p class="subtitle">Asientos por partida doble con validación estricta y cuadratura en tiempo real.</p>
        </div>
        <div class="heading-actions">
          <button class="button button-secondary" type="button" id="reset-entry">Limpiar formulario</button>
        </div>
      </div>

      <div class="empty-state-panel" id="entry-feedback" data-role="feedback" role="alert" aria-live="polite" hidden></div>

      <form id="entry-form" novalidate>
        <section class="panel" style="padding: 16px; margin-bottom: 14px">
          <div class="panel-heading">
            <div>
              <h2>Cabecera del asiento</h2>
              <p>Datos de la operación y documento de respaldo</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 14px">
            <label style="display: grid; gap: 5px; font-size: 10px; color: #697689">
              Fecha contable
              <input class="date-input" type="date" id="entry-fecha" data-field="fecha_contable" value="${escapeHtml(defaultDate())}" />
            </label>
            <label style="display: grid; gap: 5px; font-size: 10px; color: #697689">
              Tipo de documento
              <input type="text" id="entry-tipo-doc" data-field="tipo_documento" placeholder="FACTURA" />
            </label>
            <label style="display: grid; gap: 5px; font-size: 10px; color: #697689">
              Número de documento
              <input type="text" id="entry-num-doc" data-field="numero_documento" placeholder="F-001" />
            </label>
            <label style="display: grid; gap: 5px; font-size: 10px; color: #697689">
              Moneda (ISO 4217)
              <input type="text" id="entry-moneda" data-field="moneda" maxlength="3" value="${escapeHtml(defaultCurrency())}" />
            </label>
            <label style="display: grid; gap: 5px; font-size: 10px; color: #697689; grid-column: 1 / -1">
              Glosa / Descripción
              <textarea id="entry-descripcion" data-field="descripcion" rows="2" placeholder="Descripción de la operación"></textarea>
            </label>
          </div>
        </section>

        <section class="panel" style="padding: 16px">
          <div class="panel-heading">
            <div>
              <h2>Líneas del asiento</h2>
              <p>Mínimo ${MIN_LINES} líneas: una de cargo (Debe) y una de abono (Haber)</p>
            </div>
            <button class="button button-secondary button-compact" type="button" id="add-line">+ Agregar línea</button>
          </div>

          <div class="table-wrap" style="margin-top: 12px">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>CUENTA CONTABLE</th>
                  <th>CENTRO DE COSTO</th>
                  <th>GLOSA</th>
                  <th class="amount-col">DEBE</th>
                  <th class="amount-col">HABER</th>
                  <th><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody id="entry-lines">${renderLineRows()}</tbody>
            </table>
          </div>

          <div id="entry-totals" data-role="totals" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 16px">
            <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #fafbfd; border-radius: 8px">
              <span style="font-size: 10px; color: #697689">Suma Debe</span>
              <strong id="total-debe" data-role="suma-debe" style="font-size: 12px; color: #263244">0.0000</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #fafbfd; border-radius: 8px">
              <span style="font-size: 10px; color: #697689">Suma Haber</span>
              <strong id="total-haber" data-role="suma-haber" style="font-size: 12px; color: #263244">0.0000</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 12px; background: #fafbfd; border-radius: 8px">
              <span style="font-size: 10px; color: #697689">Diferencia</span>
              <strong id="total-diferencia" data-role="diferencia" style="font-size: 12px; color: #263244">0.0000</strong>
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 16px">
            <p id="balance-status" role="status" aria-live="polite" style="margin: 0; font-size: 10px; color: #b67a2d">
              Ingrese importes positivos de hasta 4 decimales para cuadrar el asiento.
            </p>
            <button class="button button-primary" id="save-entry" type="submit" disabled title="El Debe y el Haber deben ser iguales">${viewInfo.action}</button>
          </div>
        </section>
      </form>
    </section>
  `;
}

export default render;

function ensureListeners() {
  if (listenersBound || typeof document === 'undefined') return;
  listenersBound = true;
  document.addEventListener('input', handleFieldChange);
  document.addEventListener('change', handleFieldChange);
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
}

function resetDraft() {
  submitAttempted = false;
  lines = [createLine(), createLine()];
}

function createLine() {
  const line = { id: `line-${nextLineId++}`, cuenta: '', centro: '', glosa: '', debe: '', haber: '' };
  return line;
}

function renderLineRows() {
  return lines
    .map((line, index) => {
      const number = escapeHtml(String(index + 1));
      const id = escapeHtml(line.id);
      return `
        <tr class="entry-line" data-line-id="${id}">
          <td>${number}</td>
          <td>
            <select id="line-cuenta" name="cuenta" data-field="cuenta" aria-label="Cuenta contable de la línea ${number}" style="min-width: 190px">
              ${renderAccountOptions(line.cuenta)}
            </select>
          </td>
          <td>
            <select id="line-departamento" name="centro" data-field="centro" aria-label="Centro de costo de la línea ${number}" style="min-width: 150px">
              ${renderCostCenterOptions(line.centro)}
            </select>
          </td>
          <td>
            <input type="text" id="line-glosa" name="glosa" data-field="glosa" value="${escapeHtml(line.glosa)}" placeholder="Glosa opcional" style="min-width: 150px" />
          </td>
          <td class="amount-col">
            <input type="text" id="line-debe" name="debe" data-field="debe" inputmode="decimal" autocomplete="off" value="${escapeHtml(line.debe)}" placeholder="0.0000" style="width: 110px; text-align: right" />
          </td>
          <td class="amount-col">
            <input type="text" id="line-haber" name="haber" data-field="haber" inputmode="decimal" autocomplete="off" value="${escapeHtml(line.haber)}" placeholder="0.0000" style="width: 110px; text-align: right" />
          </td>
          <td>
            <button class="button button-secondary button-compact" type="button" data-action="remove-line" data-line-id="${id}" aria-label="Quitar línea ${number}"${lines.length <= MIN_LINES ? ' disabled title="El asiento requiere al menos 2 líneas"' : ''}>Quitar</button>
            <div class="line-error line-amount-error" data-role="line-error" role="alert" style="margin-top: 4px; max-width: 190px; white-space: normal; color: #c76854; font-size: 9px" hidden></div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderAccountOptions(selected) {
  const options = ['<option value="">Seleccione una cuenta</option>'];
  for (const account of selectableAccounts()) {
    const id = String(account.id ?? account._id ?? '');
    const label = [account.codigo, account.nombre].filter(Boolean).join(' — ') || id;
    options.push(`<option value="${escapeHtml(id)}"${id === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`);
  }
  return options.join('');
}

function renderCostCenterOptions(selected) {
  const options = ['<option value="">Sin centro de costo</option>'];
  for (const department of costCenters()) {
    const id = String(department.id ?? department._id ?? '');
    const label = department.nombre || department.codigo || id;
    options.push(`<option value="${escapeHtml(id)}"${id === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`);
  }
  return options.join('');
}

function selectableAccounts() {
  return loadCollection('accounts').records.filter(Boolean).filter((account) => isSelectableAccount(account));
}

function isSelectableAccount(account) {
  return Boolean(account) && account.activa !== false && account.acepta_movimientos !== false;
}

function costCenters() {
  const seen = new Set();
  return [...loadDepartments(), ...loadCollection('centros-costo').records]
    .filter(Boolean)
    .filter((department) => {
      const id = String(department.id ?? department._id ?? '');
      if (!id || seen.has(id) || department.activa === false) return false;
      seen.add(id);
      return true;
    });
}

function handleFieldChange(event) {
  const root = getViewRoot(event.target);
  if (!root || !event.target?.matches?.('[data-field]')) return;

  const lineElement = event.target.closest('.entry-line');
  if (lineElement) {
    const line = findLine(lineElement.dataset.lineId);
    if (!line) return;
    line[event.target.dataset.field] = event.target.value;

    if (event.target.dataset.field === 'debe' || event.target.dataset.field === 'haber') {
      const raw = event.target.value.trim();
      if (raw) {
        const checked = checkAmount(raw);
        if (!checked.valid) notify(checked.message, true);
      }
    }
  }

  updateView(root, evaluate(root));
}

function handleClick(event) {
  const root = getViewRoot(event.target);
  if (!root) return;

  if (event.target.closest('#add-line')) {
    event.preventDefault();
    if (lines.length >= MAX_LINES) {
      notify(`Máximo ${MAX_LINES} líneas por asiento.`, true);
      return;
    }
    lines.push(createLine());
    redrawLines(root);
    updateView(root, evaluate(root));
    root.querySelector('.entry-line:last-child select[data-field="cuenta"]')?.focus();
    return;
  }

  const removeButton = event.target.closest('[data-action="remove-line"]');
  if (removeButton) {
    event.preventDefault();
    if (lines.length <= MIN_LINES) {
      notify(`El asiento requiere al menos ${MIN_LINES} líneas.`, true);
      return;
    }
    lines = lines.filter((line) => line.id !== removeButton.dataset.lineId);
    redrawLines(root);
    updateView(root, evaluate(root));
    return;
  }

  if (event.target.closest('#reset-entry')) {
    event.preventDefault();
    resetForm(root);
    return;
  }

  const goButton = event.target.closest('[data-go]');
  if (goButton) {
    const nav = [...document.querySelectorAll('.nav-item')].find(
      (item) => item.dataset.view === goButton.dataset.go,
    );
    nav?.click();
  }
}

function handleSubmit(event) {
  const form = event.target?.closest?.('#entry-form');
  const root = getViewRoot(form);
  if (!form || !root) return;

  event.preventDefault();
  submitAttempted = true;
  const result = evaluate(root);
  updateView(root, result);

  if (!result.valid) {
    notify(result.firstError || 'Revise los datos del asiento antes de guardar.', true);
    return;
  }

  const saved = saveEntry({
    ...readHeader(root),
    estado: ENTRY_STATE.BORRADOR,
    id_usuario_creador: currentUserId(),
    detalles: lines.map((line, index) => ({
      id_cuenta: line.cuenta,
      id_departamento: line.centro || null,
      numero_linea: index + 1,
      monto_debe: line.debe.trim() ? Number(line.debe) : 0,
      monto_haber: line.haber.trim() ? Number(line.haber) : 0,
      glosa: line.glosa.trim(),
    })),
  });

  if (!saved.success) {
    notify(saved.error || saved.errors?.join('; ') || 'No se pudo guardar el asiento.', true);
    return;
  }

  resetForm(root);
  notify(`Asiento ${saved.entry.id} guardado en estado Borrador.`, false);
  if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
    document.dispatchEvent(new CustomEvent('finance:data-changed'));
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('refresh'));
}

function evaluate(root) {
  syncLinesFromDom(root);

  const accounts = selectableAccounts();
  const errorsByLine = {};
  let debeScaled = 0;
  let haberScaled = 0;
  let hasDebe = false;
  let hasHaber = false;

  for (const line of lines) {
    const errors = [];
    if (!line.cuenta) {
      errors.push('Seleccione una cuenta contable');
    } else if (!accounts.some((account) => String(account.id ?? account._id ?? '') === line.cuenta)) {
      errors.push('La cuenta seleccionada no está activa o no acepta movimientos');
    }

    const debeRaw = String(line.debe ?? '').trim();
    const haberRaw = String(line.haber ?? '').trim();
    const debeCheck = debeRaw ? checkAmount(debeRaw) : null;
    const haberCheck = haberRaw ? checkAmount(haberRaw) : null;

    if (debeRaw && !debeCheck.valid) errors.push(`Debe: ${debeCheck.message}`);
    if (haberRaw && !haberCheck.valid) errors.push(`Haber: ${haberCheck.message}`);
    if (debeCheck?.valid && haberCheck?.valid) errors.push('Elija un solo lado: Debe o Haber');
    if (!debeRaw && !haberRaw) errors.push('Ingrese un importe en Debe o en Haber');

    if (debeCheck?.valid && !haberRaw) {
      debeScaled += toScaled(debeRaw);
      hasDebe = true;
    }
    if (haberCheck?.valid && !debeRaw) {
      haberScaled += toScaled(haberRaw);
      hasHaber = true;
    }

    errorsByLine[line.id] = errors;
  }

  const headerErrors = readHeaderErrors(root);
  const lineCountOk = lines.length >= MIN_LINES;
  const bothSides = hasDebe && hasHaber;
  const balanced = debeScaled === haberScaled;
  const firstLineError = Object.values(errorsByLine).flat()[0] || '';
  const firstError =
    headerErrors[0] ||
    (lineCountOk ? '' : `Se requieren al menos ${MIN_LINES} líneas`) ||
    firstLineError ||
    (bothSides ? '' : 'Se requiere al menos una línea de cargo (Debe) y una de abono (Haber)') ||
    (balanced ? '' : `El total de Debe debe ser exactamente igual al total de Haber (diferencia ${formatScaled(debeScaled - haberScaled)})`);

  return {
    errorsByLine,
    headerErrors,
    debeScaled,
    haberScaled,
    diferenciaScaled: debeScaled - haberScaled,
    balanced,
    bothSides,
    lineCountOk,
    valid: !firstError,
    firstError,
  };
}

function updateView(root, result) {
  const totalDebe = root.querySelector('#total-debe');
  const totalHaber = root.querySelector('#total-haber');
  const totalDiferencia = root.querySelector('#total-diferencia');
  if (totalDebe) totalDebe.textContent = formatScaled(result.debeScaled);
  if (totalHaber) totalHaber.textContent = formatScaled(result.haberScaled);
  if (totalDiferencia) totalDiferencia.textContent = formatScaled(result.diferenciaScaled);

  root.querySelectorAll('.entry-line').forEach((row) => {
    const errorElement = row.querySelector('[data-role="line-error"]');
    if (!errorElement) return;
    const errors = result.errorsByLine[row.dataset.lineId] || [];
    const visible = submitAttempted || errors.length > 0;
    errorElement.textContent = visible ? errors.join(' · ') : '';
    errorElement.hidden = !visible || errors.length === 0;
  });

  const status = root.querySelector('#balance-status');
  if (status) {
    status.textContent = result.valid
      ? 'Asiento cuadrado: Debe y Haber coinciden. Listo para guardar como Borrador.'
      : result.firstError;
    status.style.color = result.valid ? '#21875f' : '#b67a2d';
  }

  const saveButton = root.querySelector('#save-entry');
  if (saveButton) {
    saveButton.disabled = !result.valid;
    saveButton.setAttribute('aria-disabled', String(!result.valid));
    saveButton.title = result.valid ? 'Guardar asiento en estado Borrador' : result.firstError;
  }
}

function syncLinesFromDom(root) {
  if (!root) return;
  root.querySelectorAll('.entry-line').forEach((row) => {
    const line = findLine(row.dataset.lineId);
    if (!line) return;
    row.querySelectorAll('[data-field]').forEach((field) => {
      line[field.dataset.field] = field.value;
    });
  });
}

function redrawLines(root) {
  const tbody = root.querySelector('#entry-lines');
  if (tbody) tbody.innerHTML = renderLineRows();
}

function resetForm(root) {
  resetDraft();
  redrawLines(root);

  const fecha = root.querySelector('#entry-fecha');
  if (fecha) fecha.value = defaultDate();
  for (const selector of ['#entry-tipo-doc', '#entry-num-doc', '#entry-descripcion']) {
    const field = root.querySelector(selector);
    if (field) field.value = '';
  }
  const moneda = root.querySelector('#entry-moneda');
  if (moneda) moneda.value = defaultCurrency();

  notify('', false);
  updateView(root, evaluate(root));
}

function readHeader(root) {
  const value = (selector) => root?.querySelector(selector)?.value?.trim() ?? '';
  return {
    fecha_contable: value('#entry-fecha'),
    tipo_documento: value('#entry-tipo-doc'),
    numero_documento: value('#entry-num-doc'),
    descripcion: value('#entry-descripcion'),
    moneda: value('#entry-moneda').toUpperCase(),
  };
}

function readHeaderErrors(root) {
  const header = readHeader(root);
  const errors = [];
  if (!header.fecha_contable) errors.push('La fecha contable es requerida');
  if (!header.tipo_documento) errors.push('El tipo de documento es requerido');
  if (!header.numero_documento) errors.push('El número de documento es requerido');
  if (!header.descripcion) errors.push('La descripción es requerida');
  if (!/^[A-Z]{3}$/.test(header.moneda)) errors.push('La moneda debe ser un código ISO 4217 de 3 letras');
  return errors;
}

function checkAmount(raw) {
  const value = String(raw ?? '').trim();
  if (value === '') return { valid: false, message: 'El importe es requerido' };
  if (!/^\d+(?:\.\d{1,4})?$/.test(value)) {
    if (/^-/.test(value)) return { valid: false, message: 'El importe no puede ser negativo' };
    if (/^\d+\.\d{5,}$/.test(value)) {
      return { valid: false, message: 'El importe no puede tener más de 4 decimales' };
    }
    return { valid: false, message: 'Importe inválido: use números con hasta 4 decimales' };
  }
  if (Number(value) <= 0) return { valid: false, message: 'El importe no puede ser cero' };
  return { valid: true, amount: Number(value) };
}

function toScaled(value) {
  const [integer = '0', decimals = ''] = String(value).trim().split('.');
  return Number(integer) * SCALE + Number(decimals.padEnd(PRECISION, '0'));
}

function formatScaled(scaled) {
  const sign = scaled < 0 ? '-' : '';
  const absolute = Math.abs(scaled);
  return `${sign}${Math.floor(absolute / SCALE)}.${String(absolute % SCALE).padStart(PRECISION, '0')}`;
}

function defaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultCurrency() {
  const company = loadCollection('company').records.find(Boolean);
  return company?.moneda || 'USD';
}

function currentUserId() {
  const users = loadUsers().filter(Boolean);
  return (users.find((user) => user.role === 'admin') || users[0])?.id || 'user-1';
}

function findLine(id) {
  return lines.find((line) => line.id === id);
}

function getViewRoot(target) {
  if (typeof document === 'undefined' || !target?.closest) return null;
  return target.closest('#nueva-transaccion-view');
}

function notify(message, isError = false) {
  const root = typeof document === 'undefined' ? null : document.querySelector('#nueva-transaccion-view');
  const feedback = root?.querySelector('#entry-feedback');
  if (feedback) {
    feedback.textContent = message;
    feedback.hidden = !message;
    feedback.classList.toggle('is-error', Boolean(message && isError));
    feedback.style.borderLeft = message
      ? isError
        ? '3px solid #c76854'
        : '3px solid #21875f'
      : '';
  }

  const toast = document.querySelector('#toast');
  if (toast && message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}
