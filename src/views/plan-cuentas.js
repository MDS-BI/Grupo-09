import { loadCollection } from '../storage.js'
import { addAccount, updateAccount } from '../domain/account.js'
import {
  checkAccountIntegrity,
  deleteAccount as deleteAccountService,
} from '../services/account-service.js'

let editingId = null

export const viewInfo = {
  title: 'Plan de cuentas',
  breadcrumb: 'Plan de cuentas',
  description: 'Organiza las cuentas contables y consulta su clasificación financiera.',
  action: 'Nueva cuenta contable',
}

function getNatureSuggestion(tipo) {
  const sugerencias = {
    Activo: 'Debe',
    Pasivo: 'Haber',
    Patrimonio: 'Haber',
    Ingreso: 'Haber',
    Gasto: 'Debe',
  }
  return sugerencias[tipo] || 'Debe'
}

function renderAccountForm(account = {}, allAccounts = []) {
  const isEditing = editingId !== null
  const acc = allAccounts.find((a) => a.id === account.id) || account
  const tipo = acc.tipo || 'Activo'
  const naturaleza = acc.naturaleza || getNatureSuggestion(tipo)

  const parentOptions = allAccounts
    .filter((a) => a.id !== account.id)
    .map((a) => {
      const selected = a.id === acc.id_cuenta_padre ? 'selected' : ''
      return `<option value="${a.id}" ${selected}>${a.codigo} - ${a.nombre}</option>`
    })
    .join('')

  const tipoOptions = `
    <option value="Activo" ${tipo === 'Activo' ? 'selected' : ''}>Activo</option>
    <option value="Pasivo" ${tipo === 'Pasivo' ? 'selected' : ''}>Pasivo</option>
    <option value="Patrimonio" ${tipo === 'Patrimonio' ? 'selected' : ''}>Patrimonio</option>
    <option value="Ingreso" ${tipo === 'Ingreso' ? 'selected' : ''}>Ingreso</option>
    <option value="Gasto" ${tipo === 'Gasto' ? 'selected' : ''}>Gasto</option>
  `

  const naturalezaOptions = `
    <option value="Debe" ${naturaleza === 'Debe' ? 'selected' : ''}>Debe</option>
    <option value="Haber" ${naturaleza === 'Haber' ? 'selected' : ''}>Haber</option>
  `

  const activaOptions = `
    <option value="true" ${acc.activa === true ? 'selected' : ''}>Sí</option>
    <option value="false" ${acc.activa === false ? 'selected' : ''}>No</option>
  `

  return `
    <section class="accounts-view">
      <div class="panel-heading">
        <h2>— CATÁLOGO CONTABLE</h2>
        <p>Plan de cuentas</p>
      </div>

      <div class="account-form-section">
        <div class="account-card">
          <h3 style="margin: 0 0 12px; font: 700 13px Manrope, sans-serif; color: #263244">
            ${isEditing ? 'Editar cuenta contable' : 'Nueva cuenta contable'}
          </h3>
          <form id="account-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="account-codigo">Código de cuenta</label>
                <input type="text" id="account-codigo"
                  value="${acc.codigo || ''}"
                  placeholder="1100"
                  required />
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
            </div>
            <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px">
              <button type="button" class="button button-secondary" id="cancel-account">Cancelar</button>
              <button type="submit" class="button button-primary" id="save-account">${isEditing ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      </div>

      <div class="account-list-section">
        <h3 style="margin: 0 0 12px; font: 700 13px Manrope, sans-serif; color: #263244">Cuentas registradas</h3>
        <div class="list-filters">
          <input type="text" id="buscador-cuentas" placeholder="Buscar por código o nombre" style="flex: 1; padding: 8px 12px; border: 1px solid #d0d5dd; border-radius: 6px; font-size: 13px">
          <select id="filtro-tipo" style="margin-left: 8px; padding: 8px 12px; border: 1px solid #d0d5dd; border-radius: 6px; font-size: 13px">
            <option value="">Todos los tipos</option>
            <option value="Activo">Activo</option>
            <option value="Pasivo">Pasivo</option>
            <option value="Patrimonio">Patrimonio</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Gasto">Gasto</option>
          </select>
          <select id="filtro-estado">
            <option value="">Todos los estados</option>
            <option value="activa">Activas</option>
            <option value="inactiva">Inactivas</option>
          </select>
        </div>
        <div id="account-list">${renderAccountList(allAccounts)}</div>
      </div>
    </section>
  `
}

function renderAccountList(accounts) {
  const accountsFilter = accounts || []

  if (accountsFilter.length === 0) {
    return `<p style="text-align: center; color: #777; padding: 20px">No hay cuentas registradas</p>`
  }

  let html = ''
  accountsFilter.forEach((account) => {
    const integrity = checkAccountIntegrity(account.id)

    const padreCuenta = accountsFilter.find((a) => a.id === account.id_cuenta_padre)
    const padreNombre = padreCuenta ? padreCuenta.nombre : 'Ninguna'

    const tipoBadge = `
      <span class="badge badge-tipo ${account.tipo.toLowerCase()}" title="${account.tipo}">${account.tipo}</span>
    `
    const naturalezaBadge = `
      <span class="badge badge-naturaleza ${account.naturaleza.toLowerCase()}" title="${account.naturaleza}">${account.naturaleza}</span>
    `
    const estadoBadge = `
      <span class="badge badge-estado ${account.activa === true ? 'badge-activo' : 'badge-inactivo'}" title="${account.activa === true ? 'Activa' : 'Inactiva'}">${account.activa === true ? 'Activa' : 'Inactiva'}</span>
    `

    const canDelete = integrity.allowed
    const deleteBtn = canDelete
      ? `<button type="button" class="text-link" data-action="delete" data-account-id="${account.id}">Eliminar</button>`
      : `<button type="button" class="text-link danger" data-action="desactivar" data-account-id="${account.id}">Desactivar</button>`

    const editBtn = `<button type="button" class="text-link" data-action="edit" data-account-id="${account.id}">Editar</button>`

    const activateBtn = account.activa === false
      ? `<button type="button" class="text-link success" data-action="activar" data-account-id="${account.id}">Activar</button>`
      : ''

    const desactivateBtn = account.activa === true
      ? `<button type="button" class="text-link danger" data-action="desactivar" data-account-id="${account.id}">Desactivar</button>`
      : ''

    html += `
      <div style="border: 1px solid #e0e7ff; border-radius: 8px; padding: 16px; margin: 8px 0; background: #f8fbff; display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: start">
        <div style="grid-column: 1 / -1">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
            <h4 style="font-weight: 500; color: #1a1a2e; margin: 0; font-size: 14px">${account.nombre}</h4>
            <div style="display: flex; gap: 4px;">
              ${tipoBadge}
              ${naturalezaBadge}
              ${estadoBadge}
            </div>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 12px">
            <span>Código: ${account.codigo}</span>
            <span style="margin-left: 12px">Tipo: ${account.tipo}</span>
            <span style="margin-left: 12px">Naturaleza: ${account.naturaleza}</span>
            <span style="margin-left: 12px">Padre: ${padreNombre}</span>
            <span style="margin-left: 12px">Estado: ${account.activa === true ? 'Activa' : 'Inactiva'}</span>
          </div>
        </div>
        <div style="grid-column: 2 / 3; align-self: center; justify-self: end; white-space: nowrap">
          ${activateBtn}
          ${desactivateBtn}
          ${editBtn}
          ${deleteBtn}
        </div>
        ${!canDelete ? `<div style="margin-top: 8px; font-size: 8px; color: #d98260; align-self: center; justify-self: end; width: 100%;">${integrity.reason || 'No se puede eliminar'}</div>` : ''}
      </div>
    `
  })

  return `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">${html}</div>`
}

export function render() {
  const accounts = loadCollection('accounts').records
  editingId = null
  queueMicrotask(bindViewListeners)
  return render(accounts)
}

function refreshView() {
  const currentView = document.querySelector('.accounts-view')
  if (!currentView) return

  const container = document.createElement('div')
  container.innerHTML = render(loadCollection('accounts').records)
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

class ValidationError extends Error {}

function saveToAudit(action, accountData) {
  let auditLogs = JSON.parse(localStorage.getItem('accountAuditLogs') || '[]')
  auditLogs.push({
    id: Date.now(),
    action,
    timestamp: new Date().toISOString(),
    account: {
      id: accountData.id,
      codigo: accountData.codigo,
      nombre: accountData.nombre,
      tipo: accountData.tipo,
      naturaleza: accountData.naturaleza,
    }
  })
  // Keep only last 50 logs
  if (auditLogs.length > 50) auditLogs = auditLogs.slice(-50)
  localStorage.setItem('accountAuditLogs', JSON.stringify(auditLogs))
}

function suggestNatureFromType() {
  const tipoSelect = document.querySelector('#account-tipo')
  const naturalezaSelect = document.querySelector('#account-naturaleza')
  if (!tipoSelect || !naturalezaSelect) return

  tipoSelect.addEventListener('change', (e) => {
    const sugerida = getNatureSuggestion(e.target.value)
    naturalezaSelect.value = sugerida
  })
}

function bindAccountListListeners() {
  const buscador = document.querySelector('#buscador-cuentas')
  const filtroTipo = document.querySelector('#filtro-tipo')
  const filtroEstado = document.querySelector('#filtro-estado')

  // Auto-suggest nature based on type
  suggestNatureFromType()

  // Apply filters and search
  function applyFilters() {
    const term = (buscador || {}).value.trim().toLowerCase() || ''
    const tipoSel = (filtroTipo || {}).value || ''
    const estadoSel = (filtroEstado || {}).value || ''

    let filtered = loadCollection('accounts').records

    if (tipoSel) {
      filtered = filtered.filter(a => a.tipo === tipoSel)
    }
    if (estadoSel) {
      filtered = filtered.filter(a => a.activa === (estadoSel === 'activa'))
    }
    if (term) {
      filtered = filtered.filter(a =>
        a.codigo.toLowerCase().includes(term) || a.nombre.toLowerCase().includes(term)
      )
    }

    const listDiv = document.querySelector('#account-list')
    if (listDiv) {
      listDiv.innerHTML = renderAccountList(filtered)
    }
    bindAccountListListeners()
  }

  if (buscador) buscador.addEventListener('input', applyFilters)
  if (filtroTipo) filtroTipo.addEventListener('change', applyFilters)
  if (filtroEstado) filtroEstado.addEventListener('change', applyFilters)

  document
    .querySelectorAll(
      '.accounts-view [data-action="edit"], .accounts-view [data-action="delete"], .accounts-view [data-action="desactivar"], .accounts-view [data-action="activar"]'
    )
    .forEach((btn) => {
      if (btn.dataset.bound) return
      btn.dataset.bound = 'true'

      btn.addEventListener('click', () => {
        const accountId = btn.dataset.accountId
        const action = btn.dataset.action

        if (action === 'edit') {
          startEditing(accountId)
          return
        }

        if (action === 'activar') {
          try {
            const result = updateAccount(accountId, { activa: true })
            if (!result.success) {
              showError(result.error || 'No se pudo activar la cuenta')
              return
            }
            showToast('Cuenta activada correctamente')
            saveToAudit('activar', { id: accountId, codigo: '', nombre: '', tipo: '', naturaleza: '' })
            refreshView()
          } catch (error) {
            showError(`No se pudo activar la cuenta: ${getErrorMessage(error)}`)
          }
          return
        }

        if (action === 'desactivar') {
          try {
            const result = updateAccount(accountId, { activa: false })
            if (!result.success) {
              showError(result.error || 'No se pudo desactivar la cuenta')
              return
            }
            showToast('Cuenta desactivada correctamente')
            saveToAudit('desactivar', { id: accountId, codigo: '', nombre: '', tipo: '', naturaleza: '' })
            refreshView()
          } catch (error) {
            showError(`No se pudo desactivar la cuenta: ${getErrorMessage(error)}`)
          }
          return
        }

        // Delete action - check for associated movements
        if (action === 'delete') {
          try {
            const journals = JSON.parse(localStorage.getItem('journals') || '[]')
            const hasMovements = journals.some(j =>
              j.lines.some(line => line.id_cuenta === accountId)
            )

            if (hasMovements) {
              showError('No se puede eliminar esta cuenta porque tiene movimientos asociados en los asientos contables. Desactive la cuenta en su lugar.')
              return
            }

            const result = deleteAccountService(accountId)
            if (!result.success) {
              showError(result.error || 'No se pudo eliminar la cuenta')
              return
            }
            showToast('Cuenta eliminada correctamente')
            saveToAudit('eliminar', { id: accountId, codigo: '', nombre: '', tipo: '', naturaleza: '' })
            refreshView()
          } catch (error) {
            showError(`No se pudo eliminar la cuenta: ${getErrorMessage(error)}`)
          }
          return
        }
      })
    })
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

  // Auto-suggest nature if still default
  const naturalezaInput = form.querySelector('#account-naturaleza')
  if (naturalezaInput && !currentAccount) {
    const sugerida = getNatureSuggestion(tipo)
    if (naturalezaInput.value === 'Debe' || naturalezaInput.value === 'Haber') {
      naturalezaInput.value = sugerida
    }
  }

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

  try {
    const codeExists = existingAccounts.some(
      (a) => a.codigo === codigo && a.id !== editingId
    )
    if (codeExists) {
      throw new ValidationError('Ya existe una cuenta con ese código')
    }

    if (id_cuenta_padre && id_cuenta_padre === editingId) {
      throw new ValidationError('Una cuenta no puede ser su propia padre')
    }

    const integrity = editingId !== null ? checkAccountIntegrity(editingId) : null
    if (integrity && integrity.allowed === false && /ciclo/i.test(integrity.reason || '')) {
      throw new ValidationError(integrity.reason)
    }

    if (creaCicloJerarquico(editingId, id_cuenta_padre, existingAccounts)) {
      throw new ValidationError('No se puede crear un ciclo jerárquico con la cuenta padre seleccionada')
    }

    const result = editingId !== null
      ? updateAccount(editingId, account)
      : addAccount(account)

    if (!result.success) {
      const errorMsg = result.errors?.length > 0
        ? result.errors.join('; ')
        : result.error || 'Error desconocido'
      throw new Error(errorMsg)
    }

    showToast(editingId !== null ? 'Cuenta actualizada correctamente' : 'Cuenta guardada correctamente')
    editingId = null
    clearError()
    refreshView()

    // Save to audit log
    const savedAccount = { ...account, id: editingId || Date.now() }
    saveToAudit(editingId !== null ? 'editar' : 'crear', savedAccount)
  } catch (error) {
    showError(error instanceof ValidationError
      ? error.message
      : `No se pudo guardar la cuenta: ${getErrorMessage(error)}`)
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

function startEditing(accountId) {
  const account = loadCollection('accounts').records.find((a) => a.id === accountId)
  if (!account) {
    showError('Cuenta no encontrada')
    return
  }

  editingId = accountId
  clearError()
  refreshView()
  document
    .querySelector('.accounts-view .account-form-section')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleCancel() {
  editingId = null
  clearError()
  refreshView()
}

function clearError() {
  document.querySelectorAll('.accounts-view .account-error').forEach((el) => el.remove())
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

function showToast(message) {
  const toast = document.querySelector('#toast')
  if (!toast) return
  toast.textContent = message
  toast.classList.add('show')
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600)
}