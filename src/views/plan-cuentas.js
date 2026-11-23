import { loadCollection } from '../storage.js'
import { addAccount } from '../domain/account.js'
import {
  checkAccountIntegrity,
  deleteAccount as deleteAccountService,
  updateAccount as updateAccountService,
} from '../services/account-service.js'

let editingId = null

export const viewInfo = {
  title: 'Plan de cuentas',
  breadcrumb: 'Plan de cuentas',
  description: 'Organiza las cuentas contables y consulta su clasificación financiera.',
  action: 'Nueva cuenta contable',
}

function renderAccountForm(account = {}, allAccounts = []) {
  const isEditing = editingId !== null
  const acc = allAccounts.find((a) => a.id === account.id) || account
  const parentOptions = allAccounts
    .filter((a) => a.id !== account.id)
    .map((a) => {
      const selected = a.id === acc.id_cuenta_padre ? 'selected' : ''
      return `<option value="${a.id}" ${selected}>${a.codigo} - ${a.nombre}</option>`
    })
    .join('')
  const tipoOptions = `
    <option value="Activo" ${acc.tipo === 'Activo' ? 'selected' : ''}>Activo</option>
    <option value="Pasivo" ${acc.tipo === 'Pasivo' ? 'selected' : ''}>Pasivo</option>
    <option value="Patrimonio" ${acc.tipo === 'Patrimonio' ? 'selected' : ''}>Patrimonio</option>
    <option value="Ingreso" ${acc.tipo === 'Ingreso' ? 'selected' : ''}>Ingreso</option>
    <option value="Gasto" ${acc.tipo === 'Gasto' ? 'selected' : ''}>Gasto</option>
  `
  const naturalezaOptions = `
    <option value="Debe" ${acc.naturaleza === 'Debe' ? 'selected' : ''}>Debe</option>
    <option value="Haber" ${acc.naturaleza === 'Haber' ? 'selected' : ''}>Haber</option>
  `
  const activaOptions = `
    <option value="true" ${acc.activa === true ? 'selected' : ''}>Sí</option>
    <option value="false" ${acc.activa === false ? 'selected' : ''}>No</option>
  `

  return `
    <div class="account-form-card" style="max-width: 500px; margin: 0 auto">
      <h3 style="margin: 0 0 12px; font: 700 13px Manrope, sans-serif; color: #263244">
        ${isEditing ? 'Editar cuenta' : 'Nueva cuenta contable'}
      </h3>
      <form id="account-form">
        <div class="form-group">
          <label for="account-codigo">Código de cuenta</label>
          <input type="text" id="account-codigo"
            value="${acc.codigo || ''}"
            placeholder="1100"
            required
            ${isEditing ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label for="account-nombre">Nombre de la cuenta</label>
          <input type="text" id="account-nombre"
            value="${acc.nombre || ''}"
            placeholder="Caja y bancos"
            required />
        </div>
        <div class="form-group">
          <label for="account-tipo">Tipo</label>
          <select id="account-tipo">${tipoOptions}</select>
        </div>
        <div class="form-group">
          <label for="account-naturaleza">Naturaleza</label>
          <select id="account-naturaleza">${naturalezaOptions}</select>
        </div>
        <div class="form-group">
          <label for="account-padre">Cuenta padre</label>
          <select id="account-padre">
            <option value="">Ninguna</option>
            ${parentOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="account-activa">Activa</label>
          <select id="account-activa">${activaOptions}</select>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px">
          <button type="button" class="button button-secondary" id="cancel-account">Cancelar</button>
          <button type="submit" class="button button-primary" id="save-account">${isEditing ? 'Actualizar' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  `
}

function renderAccountList(accounts) {
  if (accounts.length === 0) {
    return `<p style="text-align: center; color: #777; padding: 20px">No hay cuentas registradas</p>`
  }

  let html = ''
  accounts.forEach((account) => {
    const integrity = checkAccountIntegrity(account.id)

    const padreCuenta = accounts.find((a) => a.id === account.id_cuenta_padre)
    const padreNombre = padreCuenta ? padreCuenta.nombre : 'Ninguna'

    const canDelete = integrity.allowed
    const deleteBtn = canDelete
      ? `<button type="button" class="text-link" data-action="delete" data-account-id="${account.id}">Eliminar</button>`
      : `<button type="button" class="text-link danger" data-action="desactivar" data-account-id="${account.id}">Desactivar cuenta</button>`

    html += `
      <div style="border: 1px solid #e0e7ff; border-radius: 8px; padding: 12px; margin: 8px 0; background: #f8fbff">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
          <span style="font-weight: 500; color: #1a1a2e;">${account.nombre}</span>
          <strong>${account.codigo}</strong>
        </div>
        <div style="font-size: 11px; color: #666">
          <span>${account.tipo} • ${account.naturaleza}</span>
          <span style="margin-left: 12px">Padre: ${padreNombre}</span>
          <span style="margin-left: 12px">Estado: ${account.activa === true ? 'Activa' : 'Inactiva'}</span>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 8px">
          ${canDelete ? deleteBtn : ''}
        </div>
        ${!canDelete ? `<span style="font-size: 8px; color: #d98260; margin-top: 4px;">${integrity.reason || 'No se puede eliminar'}</span>` : ''}
      </div>
    `
  })

  return `<div style="max-height: 400px; overflow-y: auto;">${html}</div>`
}

function renderView(accounts) {
  return `
    <section class="accounts-view">
      <div class="panel-heading">
        <h2>Plan de cuentas</h2>
        <p>Catálogo de cuentas contables</p>
      </div>

      <div class="account-form-section" style="max-width: 600px; margin: 20px 0">
        ${renderAccountForm({}, accounts)}
      </div>

      <div class="account-list-section" style="max-width: 600px; margin: 0 auto">
        <h3 style="margin: 0 0 12px; font: 700 13px Manrope, sans-serif; color: #263244">Cuentas registradas</h3>
        ${renderAccountList(accounts)}
      </div>
    </section>
  `
}

export function render() {
  const accounts = loadCollection('accounts').records
  editingId = null
  queueMicrotask(bindViewListeners)
  return renderView(accounts)
}

function refreshView() {
  const currentView = document.querySelector('.accounts-view')
  if (!currentView) return

  const container = document.createElement('div')
  container.innerHTML = renderView(loadCollection('accounts').records)
  currentView.replaceWith(container.firstElementChild)
  bindViewListeners()
}

function bindViewListeners() {
  const form = document.querySelector('.accounts-view #account-form')
  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true'
    form.addEventListener('submit', handleFormSubmit)
  }

  const cancelButton = document.querySelector('.accounts-view #cancel-account')
  if (cancelButton && !cancelButton.dataset.bound) {
    cancelButton.dataset.bound = 'true'
    cancelButton.addEventListener('click', handleCancel)
  }

  bindAccountListListeners()
}

function handleFormSubmit(event) {
  event.preventDefault()

  const form = event.currentTarget
  const codigo = form.querySelector('#account-codigo').value.trim()
  const nombre = form.querySelector('#account-nombre').value.trim()
  const tipo = form.querySelector('#account-tipo').value
  const naturaleza = form.querySelector('#account-naturaleza').value
  const id_cuenta_padre = form.querySelector('#account-padre').value
  const activa = form.querySelector('#account-activa').value === 'true'

  const existingAccounts = loadCollection('accounts').records
  const currentAccount = editingId
    ? existingAccounts.find((a) => a.id === editingId)
    : null

  const account = {
    codigo,
    nombre,
    tipo,
    naturaleza,
    id_cuenta_padre,
    activa,
    acepta_movimientos: currentAccount?.acepta_movimientos ?? true,
    es_efectivo: currentAccount?.es_efectivo ?? false,
  }

  const codeExists = existingAccounts.some(
    (a) => a.codigo === codigo && a.id !== editingId
  )
  if (codeExists) {
    showError('Ya existe una cuenta con ese código')
    return
  }

  if (id_cuenta_padre && id_cuenta_padre === editingId) {
    showError('Una cuenta no puede ser su propia padre')
    return
  }

  if (creaCicloJerarquico(editingId, id_cuenta_padre, existingAccounts)) {
    showError('No se puede crear un ciclo jerárquico con la cuenta padre seleccionada')
    return
  }

  try {
    const result = editingId
      ? updateAccountService(editingId, account)
      : addAccount(account)

    if (!result.success) {
      const errorMsg = result.errors?.length > 0
        ? result.errors.join('; ')
        : result.error || 'Error desconocido'
      showError(errorMsg)
      return
    }

    showToast(editingId ? 'Cuenta actualizada correctamente' : 'Cuenta guardada correctamente')
    editingId = null
    refreshView()
  } catch (error) {
    showError(`No se pudo guardar la cuenta: ${getErrorMessage(error)}`)
  }
}

function creaCicloJerarquico(accountId, parentId, accounts) {
  if (!accountId || !parentId) return false

  const visited = new Set()
  let currentId = parentId
  while (currentId) {
    if (currentId === accountId || visited.has(currentId)) return true
    visited.add(currentId)
    const current = accounts.find((a) => a.id === currentId)
    currentId = current?.id_cuenta_padre || null
  }
  return false
}

function handleCancel() {
  editingId = null
  refreshView()
}

function showError(message) {
  const view = document.querySelector('.accounts-view')
  if (!view) return

  view.querySelectorAll('.account-error').forEach((el) => el.remove())

  const banner = document.createElement('div')
  banner.className = 'account-error'
  banner.setAttribute('role', 'alert')
  banner.setAttribute('aria-live', 'assertive')
  banner.textContent = message
  banner.style.color = '#b42318'
  banner.style.background = '#fee4e2'
  banner.style.border = '1px solid #fda29b'
  banner.style.padding = '10px 12px'
  banner.style.borderRadius = '6px'
  banner.style.margin = '12px 0'
  banner.style.fontSize = '12px'
  banner.style.fontWeight = '600'

  const heading = view.querySelector('.panel-heading')
  if (heading) heading.after(banner)
  else view.prepend(banner)
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function bindAccountListListeners() {
  document
    .querySelectorAll(
      '.accounts-view [data-action="delete"], .accounts-view [data-action="desactivar"]'
    )
    .forEach((btn) => {
      if (btn.dataset.bound) return
      btn.dataset.bound = 'true'

      btn.addEventListener('click', () => {
        const accountId = btn.dataset.accountId
        const isDelete = btn.dataset.action === 'delete'

        try {
          const result = isDelete
            ? deleteAccountService(accountId)
            : updateAccountService(accountId, { activa: false })

          if (!result.success) {
            showError(result.error || 'No se pudo completar la operación')
            return
          }

          showToast(isDelete ? 'Cuenta eliminada correctamente' : 'Cuenta desactivada correctamente')
          refreshView()
        } catch (error) {
          showError(
            `No se pudo ${isDelete ? 'eliminar' : 'desactivar'} la cuenta: ${getErrorMessage(error)}`
          )
        }
      })
    })
}

function showToast(message) {
  const toast = document.querySelector('#toast')
  if (!toast) return
  toast.textContent = message
  toast.classList.add('show')
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600)
}