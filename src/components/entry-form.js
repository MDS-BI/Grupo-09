export function renderEntryForm(entry = {}) {
  const detallesCount = entry.detalles ? entry.detalles.length : 0
  
  const container = document.createElement('div')
  container.innerHTML = `
    <form id="entry-form">
      <div class="form-group">
        <label for="entry-fecha">Fecha contable</label>
        <input type="date" id="entry-fecha" 
               value="${entry.fecha_contable || ''}" />
      </div>
      <div class="form-group">
        <label for="entry-tipo-doc">Tipo documento</label>
        <input type="text" id="entry-tipo-doc"
               value="${entry.tipo_documento || ''}" placeholder="FACTURA" />
      </div>
      <div class="form-group">
        <label for="entry-num-doc">Número documento</label>
        <input type="text" id="entry-num-doc"
               value="${entry.numero_documento || ''}" placeholder="F-001" />
      </div>
      <div class="form-group">
        <label for="entry-descripcion">Descripción</label>
        <textarea id="entry-descripcion">${entry.descripcion || ''}</textarea>
      </div>
      <div class="form-group">
        <label for="entry-moneda">Moneda</label>
        <input type="text" id="entry-moneda"
               value="${entry.moneda || ''}" placeholder="USD" />
      </div>
      <div class="entry-lines" id="entry-lines">
        <!-- Líneas dinámicas -->
      </div>
      <button type="button" class="button button-secondary" id="add-line">Añadir línea</button>
      <button type="submit" class="button button-primary" id="save-entry" disabled>Guardar asiento</button>
    </form>
  `
  return container.firstElementChild
}

export function initEntryForm(onSave) {
  const form = document.querySelector('#entry-form')
  const linesContainer = document.querySelector('#entry-lines')
  const saveButton = document.querySelector('#save-entry')
  let lineCount = 0

  if (!form || !linesContainer || !saveButton) return

  // Render initial lines
  renderLines()

  // Add input event listeners for real-time validation
  document.querySelectorAll('#entry-lines .entry-line').forEach((lineEl) => {
    const amountFields = lineEl.querySelectorAll('input[type="number"]')
    amountFields.forEach((input) => {
      input.addEventListener('input', () => {
        validateLineInRealTime(lineEl)
        updateSaveButtonState()
      })
    })
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    
    // Collect all lines with full validation
    const lines = []
    const departments = await import('../domain/shared.js').then(mod => mod.loadDepartments)
    const validDeptIds = new Set(departments.default.map(d => d.id))
    const activeAccounts = loadActiveAccounts()
    
    let allValid = true
    
    document.querySelectorAll('.entry-line').forEach((lineEl) => {
      const montoDebe = parseFloat(lineEl.querySelector('#line-debe').value) || 0
      const montoHaber = parseFloat(lineEl.querySelector('#line-haber').value) || 0
      const idCuenta = lineEl.querySelector('#line-cuenta').value
      const idDepartamento = lineEl.querySelector('#line-departamento').value || null
      const glosa = lineEl.querySelector('#line-glosa').value || ''
      
      // Validate amount
      const amountCheck = amount(line.monto_debe > 0 ? line.monto_debe : line.monto_haber)
      if (!amountCheck.valid) {
        showInlineError(lineEl, amountCheck.message)
        allValid = false
        return
      } else {
        removeInlineError(lineEl)
      }
      
      // Validate department
      if (idDepartamento && !validDeptIds.has(idDepartamento)) {
        showToast(`Departamento ${idDepartamento} no es válido`)
        allValid = false
        return
      }
      
      // Check if account is active and accepts movements
      const account = departments.default.find(a => a.id === idCuenta)
      if (idCuenta && (account === undefined || !account.activa || !account.acepta_movimientos)) {
        showToast(`La cuenta ${idCuenta} no está activa o no acepta movimientos`)
        allValid = false
        return
      }
      
      lines.push({
        id_cuenta: idCuenta,
        id_departamento: idDepartamento,
        numero_linea: lineCount + 1,
        monto_debe: montoDebe,
        monto_haber: montoHaber,
        glosa,
      })
    })
    
    if (!allValid) return
    
    // Minimum 2 lines check
    if (lines.length < 2) {
      showToast('Se requieren al menos 2 líneas')
      return
    }
    
    // Balance validation
    const balanceErrors = validateEntryLines(lines)
    if (balanceErrors.length > 0) {
      showToast(balanceErrors[0])
      return
    }
    
    // Amount validation for each line
    for (const line of lines) {
      const amountCheck = amount(line.monto_debe > 0 ? line.monto_debe : line.monto_haber)
      if (!amountCheck.valid) {
        showToast(amountCheck.message)
        return
      }
    }
    
    onSave(lines)
  })

  document.querySelector('#add-line')?.addEventListener('click', () => {
    renderLines()
    lineCount++
    updateSaveButtonState()
  })
}

function validateLineInRealTime(lineEl) {
  const montoDebe = parseFloat(lineEl.querySelector('#line-debe').value) || 0
  const montoHaber = parseFloat(lineEl.querySelector('#line-haber').value) || 0
  
  const amountCheck = amount(line.monto_debe > 0 ? line.monto_debe : line.monto_haber)
  
  if (amountCheck.valid) {
    removeInlineError(lineEl)
  } else {
    showInlineError(lineEl, amountCheck.message)
  }
}

function showInlineError(lineEl, message) {
  const existingError = lineEl.querySelector('.line-amount-error')
  if (existingError) return
  
  const errorDiv = document.createElement('div')
  errorDiv.className = 'line-amount-error'
  errorDiv.textContent = message
  errorDiv.style.color = '#d98260'
  errorDiv.style.fontSize = '9px'
  
  const td = lineEl.querySelector('td:last-child')
  if (td) {
    td.appendChild(errorDiv)
  }
}

function removeInlineError(lineEl) {
  const existingError = lineEl.querySelector('.line-amount-error')
  if (existingError) {
    existingError.remove()
  }
}

function updateSaveButtonState() {
  const invalidLines = document.querySelectorAll('#entry-lines .entry-line .line-amount-error')
  saveButton.disabled = invalidLines.length > 0 || document.querySelectorAll('#entry-lines .entry-line').length < 2
}

function loadActiveAccounts() {
  const departments = await import('../domain/shared.js').then(mod => mod.loadDepartments)
  return departments.default.filter(a => a.activa && a.acepta_movimientos)
}

function showToast(message) {
  const toast = document.querySelector('#toast')
  if (toast) {
    toast.textContent = message
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 2600)
  }
}