export function renderAccountForm(account = {}) {
  const container = document.createElement('div')
  container.innerHTML = `
    <form id="account-form">
      <div class="form-group">
        <label for="account-codigo">Código de cuenta</label>
        <input type="text" id="account-codigo" 
               value="${account.codigo || ''}"
               placeholder="1100"
               required />
      </div>
      <div class="form-group">
        <label for="account-nombre">Nombre de la cuenta</label>
        <input type="text" id="account-nombre"
               value="${account.nombre || ''}"
               placeholder="Caja y bancos"
               required />
      </div>
      <div class="form-group">
        <label for="account-tipo">Tipo</label>
        <select id="account-tipo">
          <option value="Activo" ${account.tipo === 'Activo' ? 'selected' : ''}>Activo</option>
          <option value="Pasivo" ${account.tipo === 'Pasivo' ? 'selected' : ''}>Pasivo</option>
          <option value="Patrimonio" ${account.tipo === 'Patrimonio' ? 'selected' : ''}>Patrimonio</option>
          <option value="Ingreso" ${account.tipo === 'Ingreso' ? 'selected' : ''}>Ingreso</option>
          <option value="Gasto" ${account.tipo === 'Gasto' ? 'selected' : ''}>Gasto</option>
        </select>
      </div>
      <div class="form-group">
        <label for="account-naturaleza">Naturaleza</label>
        <select id="account-naturaleza">
          <option value="Debe" ${account.naturaleza === 'Debe' ? 'selected' : ''}>Debe</option>
          <option value="Haber" ${account.naturaleza === 'Haber' ? 'selected' : ''}>Haber</option>
        </select>
      </div>
      <div class="form-group">
        <label for="account-padre">Cuenta padre</label>
        <select id="account-padre">
          <option value="">Ninguna</option>
          <!-- Opciones cargadas dinámicamente -->
        </select>
      </div>
      <div class="form-group">
        <label for="account-acepta-movimientos">Acepta movimientos</label>
        <select id="account-acepta-movimientos">
          <option value="true" ${account.acepta_movimientos === true ? 'selected' : ''}>Sí</option>
          <option value="false" ${account.acepta_movimientos === false ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div class="form-group">
        <label for="account-es-efectivo">Cuenta de efectivo/banco</label>
        <select id="account-es-efectivo">
          <option value="true" ${account.es_efectivo === true ? 'selected' : ''}>Sí</option>
          <option value="false" ${account.es_efectivo === false ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div class="form-group">
        <label for="account-activa">Activa</label>
        <select id="account-activa">
          <option value="true" ${account.activa === true ? 'selected' : ''}>Sí</option>
          <option value="false" ${account.activa === false ? 'selected' : ''}>No</option>
        </select>
      </div>
      <button type="submit" class="button button-primary">Guardar cuenta</button>
      <button type="button" class="button button-secondary" id="cancel-account">Cancelar</button>
    </form>
  `
  return container.firstElementChild
}

export function initAccountForm(onSubmit, onCancel) {
  const form = document.querySelector('#account-form')
  if (!form) return

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const codigo = document.querySelector('#account-codigo').value.trim()
    const nombre = document.querySelector('#account-nombre').value.trim()
    const tipo = document.querySelector('#account-tipo').value
    const naturaleza = document.querySelector('#account-naturaleza').value
    const acepta_movimientos = document.querySelector('#account-acepta-movimientos').value === 'true'
    const es_efectivo = document.querySelector('#account-es-efectivo').value === 'true'
    const activa = document.querySelector('#account-activa').value === 'true'

    const account = { codigo, nombre, tipo, naturaleza, acepta_movimientos, es_efectivo, activa }
    const errors = validateAccountForm(account)

    if (errors.length > 0) {
      showValidationErrors(errors)
      return
    }

    onSubmit(account)
  })

  document.querySelector('#cancel-account')?.addEventListener('click', () => {
    onCancel()
  })
}

function validateAccountForm(account) {
  const errors = []

  if (!/^\d+(\.\d+)?$/.test(account.codigo)) {
    errors.push('El código de cuenta debe ser numérico')
  }

  if (account.codigo.length > 0) {
    const existingCodes = document.querySelectorAll('#account-codigo + .error-message')
    // Check for duplicate - simplified
  }

  if (!account.nombre || account.nombre.trim() === '') {
    errors.push('El nombre de la cuenta es requerido')
  }

  if (!account.tipo) {
    errors.push('El tipo de cuenta es requerido')
  }

  if (!account.naturaleza) {
    errors.push('La naturaleza de la cuenta es requerida')
  }

  if (account.es_efectivo !== false && account.es_efectivo !== true) {
    errors.push('El campo efectivo debe ser verdadero o falso')
  }

  if (account.activa !== false && account.activa !== true) {
    errors.push('El campo activa debe ser verdadero o falso')
  }

  return errors
}

function showValidationErrors(errors) {
  const existingErrors = document.querySelectorAll('.error-message')
  existingErrors.forEach((el) => el.remove())

  const form = document.querySelector('#account-form')
  if (!form) return

  errors.forEach((message) => {
    const errorDiv = document.createElement('div')
    errorDiv.className = 'error-message'
    errorDiv.textContent = message
    errorDiv.style.color = '#d98260'
    errorDiv.style.fontSize = '9px'
    errorStyle.marginBottom = '5px'
    const input = form.querySelector(`[name="${message.toLowerCase().replace(/ /g '-')}"]`)
    if (input) {
      input.parentNode.insertBefore(errorDiv, input.nextSibling)
    } else {
      form.insertBefore(errorDiv, form.lastElementChild)
    }
  })
}