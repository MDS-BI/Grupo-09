import { loadCollection } from '../storage.js'
import { addAccount, updateAccount } from '../domain/account.js'
import { checkAccountIntegrity } from '../services/account-service.js'

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
      ? `<button class="text-link" data-action="delete" data-account-id="${account.id}">Eliminar</button>`
      : `<button class="text-link danger" data-action="desactivar" data-account-id="${account.id}">Desactivar cuenta</button>`

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

export function render() {
  const accounts = loadCollection('accounts').records
  editingId = null

  // Always bind listeners since HTML is replaced on re-render
  const form = document.querySelector('#account-form')
  if (form) {
    form.addEventListener('submit', handleFormSubmit)
    document.querySelector('#cancel-account')?.addEventListener('click', handleCancel)
  }

  // Bind account list action listeners
  bindAccountListListeners()

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

function handleFormSubmit(e) {
  e.preventDefault()

  const codigo = document.querySelector('#account-codigo').value.trim()
  const nombre = document.querySelector('#account-nombre').value.trim()
  const tipo = document.querySelector('#account-tipo').value
  const naturaleza = document.querySelector('#account-naturaleza').value
  const id_cuenta_padre = document.querySelector('#account-padre').value
  const activa = document.querySelector('#account-activa').value === 'true'

  const account = { codigo, nombre, tipo, naturaleza, id_cuenta_padre, activa }

  // Validate duplicate code
  const existingAccounts = loadCollection('accounts').records
  const codeExists = existingAccounts.some(
    (a) => a.codigo === codigo && a.id !== editingId
  )

  if (codeExists) {
    showError('Ya existe una cuenta con ese código')
    return
  }

  // Validate no self-parent
  if (id_cuenta_padre && id_cuenta_padre === (editingId || '')) {
    showError('Una cuenta no puede ser su propia padre')
    return
  }

      if (id_cuenta_padre) {
    const accountsForCheck = loadCollection('accounts').records
    const parentAccount = accountsForCheck.find((a) => a.id === id_cuenta_padre)
    if (parentAccount && parentAccount.id_cuenta_padre === editingId) {
      showError('No se puede crear un ciclo jerárquico: la cuenta padre ya tiene este account como hijo')
      return
    }
  }

  const result = editingId
    ? updateAccount(editingId, account)
    : addAccount(account)

  if (result.success) {
    showToast(editingId ? 'Cuenta actualizada correctamente' : 'Cuenta guardada correctamente')
    editingId = null
    render()
  } else {
    const errorMsg = (result.errors && result.errors.length > 0
      ? result.errors.join('; ')
      : result.error || 'Error desconocido')
    showError(errorMsg)
  }
}

function handleCancel() {
  editingId = null
  render()
}

function showError(message) {
  const existing = document.querySelectorAll('.account-error')
  existing.forEach((el) => el.remove())

  const errorDiv = document.createElement('div')
  errorDiv.className = 'account-error'
  errorDiv.textContent = message
  errorDiv.style.color = '#d98260'
  errorDiv.style.background = '#fff4f0'
  errorDiv.style.padding = '8px 12px'
  errorDiv.style.borderRadius = '4px'
  errorDiv.style.marginTop = '8px'
  errorDiv.style.fontSize = '12px'

  const form = document.querySelector('#account-form')
  if (form && form.parentNode) {
    form.parentNode.insertBefore(errorDiv, form.nextSibling)
  }
}

function bindAccountListListeners() {
  document.querySelectorAll('[data-action="delete"], [data-action="desactivar"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accountId = btn.dataset.accountId
      if (btn.dataset.action === 'delete') {
        import('../services/account-service.js').then(mod => mod.deleteAccount(accountId))
      } else if (btn.dataset.action === 'desactivar') {
        import('../services/account-service.js').then(mod => mod.updateAccount(accountId, { activa: false }))
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