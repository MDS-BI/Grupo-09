export function renderReportsView(filters = {}) {
  const from = filters.from || ''
  const to = filters.to || ''
  
  const container = document.createElement('div')
  container.innerHTML = `
    <section class="reports-view">
      <div class="period-toolbar">
        <div class="period-label">Rango de fechas</div>
        <div class="period-inputs">
          <input type="date" id="report-from" value="${from}" />
          <span>a</span>
          <input type="date" id="report-to" value="${to}" />
        </div>
        <button class="button button-primary" id="apply-period">Aplicar</button>
      </div>
      
      <div class="report-tabs">
        <button class="report-tab selected" data-tab="resultado">Estado de Resultados</button>
        <button class="report-tab" data-tab="flujo">Flujo de Caja</button>
      </div>
      
      ${from && to ? `
        <div class="report-content" id="report-content">
          <div id="resultado" class="report-panel">
            <h3>Estado de Resultados</h3>
            <p class="empty-state" id="empty-resultado" hidden>No hay datos para el período seleccionado</p>
            <div class="resultados-desglose" id="resultados-desglose">
            </div>
          </div>
          
          <div id="flujo" class="report-panel" hidden>
            <h3>Flujo de Caja</h3>
            <p class="empty-state" id="empty-flujo" hidden>No hay datos para el período seleccionado</p>
            <div class="flujo-info" id="flujo-info">
              <p>Flujo de caja total: <strong>$0.00</strong></p>
            </div>
          </div>
        </div>
      ` : '<p class="placeholder-view">Seleccione un rango de fechas para generar el reporte</p>'}
    </section>
  `

  // Add event listeners for tab switching
  const tabButtons = container.querySelectorAll('.report-tab')
  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabButtons.forEach((t) => t.classList.remove('selected'))
      tab.classList.add('selected')
      const panelId = tab.dataset.tab
      document.querySelectorAll('.report-panel').forEach((p) => p.hidden = true)
      document.getElementById(panelId).hidden = false
    })
  })

  // Add Apply period button listener
  const applyBtn = document.querySelector('#apply-period')
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const fromInput = document.querySelector('#report-from')
      const toInput = document.querySelector('#report-to')
      
      if (fromInput && toInput) {
        const from = fromInput.value
        const to = toInput.value
        
        // Render the report
        renderReportContent(from, to)
      }
    })
  }

  return container.firstElementChild
}

function renderReportContent(from, to) {
  const { buildIncomeStatement, buildCashFlow } = await import('../src/services/report-service.js')
  const { loadCollection } = await import('../src/storage.js')
  const accounts = loadCollection('accounts').records
  
  const statement = buildIncomeStatement({ from, to })
  const cashFlow = buildCashFlow({ from, to })
  
  const resultadosDesglose = document.querySelector('#resultados-desglose')
  const emptyResultado = document.querySelector('#empty-resultado')
  const emptyFlujo = document.querySelector('#empty-flujo')
  const flujoInfo = document.querySelector('#flujo-info')
  
  // Render Estado de Resultados
  if (resultadosDesglose) {
    resultadosDesglose.innerHTML = `
      <div class="account-row">
        <span>Ingresos</span>
        <strong>$${statement.ingresos.toFixed(2)}</strong>
      </div>
      <div class="account-row">
        <span>Gastos</span>
        <strong>$${statement.gastos.toFixed(2)}</strong>
      </div>
      <div class="account-row">
        <span>Utilidad/Pérdida neta</span>
        <strong>$${statement.resultadoNeto.toFixed(2)}</strong>
      </div>
    `
    
    emptyResultado.hidden = statement.ingresos > 0 || statement.gastos > 0
  }
  
  // Render Flujo de Caja
  if (flujoInfo) {
    flujoInfo.innerHTML = `
      <p>Flujo de caja total: <strong>$${cashFlow.toFixed(2)}</strong></p>
    `
    
    emptyFlujo.hidden = cashFlow !== 0 || cashFlow !== undefined
  }
}