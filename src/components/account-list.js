export function renderAccountList(accounts = [], canDeleteAccount) {
  const container = document.createElement('div')
  container.innerHTML = `
    <section class="accounts-panel">
      <div class="panel-heading">
        <h2>Plan de cuentas</h2>
        <p>Catálogo de cuentas contables</p>
        <button class="more-button" aria-label="Más opciones">
          <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
        </button>
      </div>
      <div class="account-breakdown">
  `

  if (accounts.length === 0) {
    container.innerHTML = `
      <section class="accounts-panel">
        <div class="panel-heading">
          <h2>Plan de cuentas</h2>
          <p>Catálogo de cuentas contables</p>
        </div>
        <div class="no-results" style="padding: 20px; text-align: center; color: #777;">
          No hay cuentas registradas
        </div>
      </section>
    `
    return container.firstElementChild
  }

  accounts.forEach((account) => {
    const esEfectivo = account.es_efectivo === true
    const colorClass = esEfectivo ? 'color-cash' : 'color-other'
    const tipoClass = account.tipo === 'Ingreso' ? 'color-green' : account.tipo === 'Gasto' ? 'color-amber' : ''
    const isDeletable = canDeleteAccount ? canDeleteAccount(account.id) : { allowed: true }
    
    const containerInner = `
      <div class="account-row">
        <span class="account-color ${colorClass}"></span>
        <span class="account-name">${account.nombre}</span>
        <strong>${account.codigo}</strong>
        <span class="account-row small">${account.tipo}</span>
      </div>
      ${isDeletable.allowed ? `
        <button class="text-link" data-action="delete" data-account-id="${account.id}">Eliminar</button>
      ` : `
        <button class="text-link danger" data-action="desactivar" data-account-id="${account.id}">Desactivar cuenta</button>
      `}
      ${!isDeletable.allowed && !isDeletable.allowed === 'desactivar' ? `
        <span class="error-message" style="font-size: 8px; color: #d98260; margin-top: 5px;">${isDeletable.reason || 'No se puede eliminar'}</span>
      ` : ''}
    `
    container.innerHTML += containerInner
  })

  container.innerHTML += `
      </div>
      <button class="text-link" data-go="accounts">Ver todas las cuentas <span>→</span></button>
    </section>
  `
  
  return container.firstElementChild
}

export function initAccountList(canDeleteAccount) {
  const accounts = loadCollection('accounts').records
  const listElement = renderAccountList(accounts, canDeleteAccount)
  
  const accountsSection = document.querySelector('#view-placeholder')
  if (accountsSection) {
    accountsSection.innerHTML = ''
    accountsSection.appendChild(listElement)
  }
  
  // Add action listeners for delete/desactivate
  document.querySelectorAll('[data-action="delete"], [data-action="desactivar"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accountId = btn.dataset.accountId
      if (btn.dataset.action === 'delete') {
        // Try to delete
        import('../services/account-service.js').then(mod => mod.deleteAccount(accountId))
      } else if (btn.dataset.action === 'desactivar') {
        // Desactivate the account
        import('../services/account-service.js').then(mod => mod.updateAccount(accountId, { activa: false }))
      }
    })
  })
  
  return listElement
}