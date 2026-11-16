export function renderSettingsView() {
  const settings = await import('../services/settings-service.js').then(mod => mod.loadSettings())
  const accounts = await import('../storage.js').then(mod => mod.loadCollection('accounts'))
  const entries = await import('../storage.js').then(mod => mod.loadCollection('entries'))
  
  const schemaVersion = settings ? settings.schemaVersion : 'N/A'
  const activePeriod = settings ? settings.activePeriod : { from: '', to: '', preset: 'month' }
  
  const container = document.createElement('div')
  container.innerHTML = `
    <section class="settings-view">
      <div class="panel-heading">
        <h2>Configuración</h2>
        <p>Período activo y estado del almacenamiento</p>
      </div>
      
      <div class="setting-group">
        <h3>Período activo</h3>
        <div class="period-selector">
          <div class="period-option">
            <span>Mes</span>
            <button class="period-button ${activePeriod.preset === 'month' ? 'selected' : ''}" data-preset="month">Seleccionar</button>
          </div>
          <div class="period-option">
            <span>Trimestre</span>
            <button class="period-button ${activePeriod.preset === 'quarter' ? 'selected' : ''}" data-preset="quarter">Seleccionar</button>
          </div>
          <div class="period-option">
            <span>Rango personalizado</span>
            <button class="period-button ${activePeriod.preset === 'custom' ? 'selected' : ''}" data-preset="custom">Seleccionar</button>
          </div>
        </div>
        <div class="period-inputs" style="margin-top: 10px; display: ${activePeriod.preset === 'custom' ? 'block' : 'none'}">
          <from>
            <input type="date" id="settings-from" value="${activePeriod.from}" />
            <span>a</span>
            <input type="date" id="settings-to" value="${activePeriod.to}" />
          </from>
        </div>
      </div>
      
      <div class="setting-group">
        <button class="button button-primary" id="save-period">Guardar período</button>
        <button class="button button-secondary" id="reset-period">Restablecer</button>
      </div>
      
      <div class="setting-group">
        <h3>Estado del almacenamiento</h3>
        <div class="status-panel">
          <div class="status-item">
            <span>Versión de esquema</span>
            <strong>${schemaVersion}</strong>
          </div>
          <div class="status-item">
            <span>Cuentas</span>
            <strong>${accounts.records.length}</strong>
          </div>
          <div class="status-item">
            <span>Asientos</span>
            <strong>${entries.records.length}</strong>
          </div>
        </div>
      </div>
    </section>
  `
  
  // Add event listeners
  const periodButtons = container.querySelectorAll('.period-button')
  periodButtons.forEach((button) => {
    button.addEventListener('click', () => {
      periodButtons.forEach((b) => b.classList.remove('selected'))
      button.classList.add('selected')
      
      const preset = button.dataset.preset
      const inputs = container.querySelector('.period-inputs')
      
      if (preset === 'custom') {
        inputs.style.display = 'block'
      } else {
        inputs.style.display = 'none'
      }
    })
  })
  
  document.querySelector('#save-period')?.addEventListener('click', () => {
    const fromInput = document.querySelector('#settings-from')
    const toInput = document.querySelector('#settings-to')
    
    if (fromInput && toInput) {
      const result = await import('../services/settings-service.js').then(mod => mod.setActivePeriod(
        fromInput.value,
        toInput.value,
        document.querySelector('.period-button.selected')?.dataset.preset || 'month'
      ))
      
      if (result.success) {
        showToast('Período guardado correctamente')
      } else {
        showToast(result.error || 'Error al guardar el período')
      }
    }
  })
  
  document.querySelector('#reset-period')?.addEventListener('click', () => {
    saveSettings({ schemaVersion: '1.0', activePeriod: { from: '', to: '', preset: 'month' } })
    showToast('Período restablecido a valores por defecto')
    renderSettingsView()
  })
  
  return container.firstElementChild
}

function saveSettings(settings) {
  localStorage.setItem('@erp-settings', JSON.stringify(settings))
}

function showToast(message) {
  const toast = document.querySelector('#toast')
  if (toast) {
    toast.textContent = message
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 2600)
  }
}