export function renderCostCentersView(filters = {}) {
  const departments = await import('../domain/shared.js').then(mod => mod.loadDepartments)
  const result = await import('../services/cost-center-service.js').then(mod => mod.computeDepartmentTotals(filters))
  const entries = await import('../storage.js').then(mod => mod.loadCollection('entries'))
  
  const container = document.createElement('div')
  const from = filters.from || '2026-01-01'
  const to = filters.to || '2026-12-31'
  
  container.innerHTML = `
    <section class="cost-centers-view">
      <div class="period-toolbar">
        <div class="period-label">Período: <strong>${from} - ${to}</strong></div>
        <div class="period-tabs" role="tablist">
          <button class="period-tab selected" data-period="month">Mes</button>
          <button class="period-tab" data-period="quarter">Trimestre</button>
          <button class="period-tab" data-period="year">Año</button>
        </div>
      </div>
      
      ${departments.default.length > 0 ? `
        <div class="department-totals">
          ${departments.default.map((dept) => {
            const totals = result[dept.id] || { ingresos: 0, gastos: 0, saldoNeto: 0 }
            const esCero = totals.ingresos === 0 && totals.gastos === 0
            
            return `
              <div class="account-row">
                <span class="account-color dot-design"></span>
                <span class="account-name">${dept.nombre}</span>
                <strong>${totals.ingresos > 0 || totals.gastos > 0 ? `$${totals.ingresos.toFixed(2)} - $${totals.gastos.toFixed(2)}` : '$0.00 - $0.00'}</strong>
                <span class="account-row small">${totals.saldoNeto.toFixed(2)}</span>
              </div>
            `
          }).join('')}
        </div>
        <div class="account-row" style="border-top: 1px solid #e9edf3; margin-top: 10px; padding-top: 10px;">
          <span class="account-color dot-sales"></span>
          <span class="account-name">Sin departamento</span>
          <strong>${result['Sin departamento'].ingresos > 0 || result['Sin departamento'].gastos > 0 ? `$${result['Sin departamento'].ingresos.toFixed(2)} - $${result['Sin departamento'].gastos.toFixed(2)}` : '$0.00 - $0.00'}</strong>
          <span class="account-row small">${result['Sin departamento'].saldoNeto.toFixed(2)}</span>
        </div>
      ` : '<p class="no-results">No hay departamentos configurados</p>'}
      
      ${entries.records.length === 0 ? '<p class="placeholder-view"><span class="placeholder-icon"><svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h16" /></svg></span><p>No hay entradas contabilizadas para el período seleccionado</p>' : ''}
    </section>
  `
  
  return container.firstElementChild
}

export function initCostCentersView() {
  const periodTabs = document.querySelectorAll('.period-tab')
  const applyBtn = document.querySelector('.button-primary')
  
  if (periodTabs.length > 0) {
    periodTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        periodTabs.forEach((t) => t.classList.remove('selected'))
        tab.classList.add('selected')
      })
    })
  }
  
  return renderCostCentersView()
}