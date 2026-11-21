import { approveEntry } from '../services/approval-service.js'

export function renderEntryActions(entry) {
  const canEdit =
    entry.estado !== 'Contabilizada' && entry.estado !== 'Revertida'
  const canReverse =
    entry.estado === 'Contabilizada'
  const canApprove = entry.estado === 'Pendiente'
  const canPost = entry.estado === 'Aprobada'

  let html = ''

  if (canReverse) {
    html += `
      <button class="button button-small" data-action="reverse">Revertir</button>
    `
  }

  if (canApprove) {
    html += `
      <button class="button button-small" data-action="approve">Enviar a revisión</button>
    `
  }

  if (canPost) {
    html += `
      <button class="button button-small" data-action="post">Publicar y contabilizar</button>
    `
  }

  if (!canEdit) {
    html += `
      <span class="status-pill status-approved">
        <i></i>${entry.estado}
      </span>
    `
  } else {
    html += `
      <span class="status-pill status-pending">
        <i></i>${entry.estado}
      </span>
    `
  }

  return html
}

export function initEntryActions() {
  document.querySelectorAll('[data-action="reverse"]').forEach((button) => {
    button.addEventListener('click', () => {
      const entryId = button.dataset.entryId
      if (!entryId) return

      const { reverseEntry } = await import('../services/reverse-service.js')
      const result = reverseEntry(entryId)

      if (result.success) {
        showToast('Asiento revertido correctamente')
        setTimeout(() => {
          window.dispatchEvent(new Event('refresh'))
        }, 100)
      } else {
        showToast(result.error || 'Error al revertir el asiento')
      }
    })
  })

  document.querySelectorAll('[data-action="approve"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const entryId = button.dataset.entryId
      if (!entryId) return

      const { approveEntry } = await import('../services/approval-service.js')
      
      // Get the entry from localStorage or state
      const entries = await import('../storage.js').then(mod => mod.loadCollection('entries'))
      const entry = entries.records.find(e => e.id === entryId)
      
      if (!entry) {
        showToast('Asiento no encontrado')
        return
      }

      const result = await approveEntry(entry, 'user-1')

      if (result.success) {
        showToast('Asiento aprobado correctamente')
        setTimeout(() => {
          window.dispatchEvent(new Event('refresh'))
        }, 100)
      } else {
        showToast(result.error || 'Error al aprobar el asiento')
      }
    })
  })

  document.querySelectorAll('[data-action="post"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const entryId = button.dataset.entryId
      if (!entryId) return

      const entries = await import('../storage.js').then(mod => mod.loadCollection('entries'))
      const entry = entries.records.find(e => e.id === entryId)
      
      if (!entry) {
        showToast('Asiento no encontrado')
        return
      }

      // Final save as Contabilizada
      const result = await import('../services/entry-service.js').then(mod => mod.saveEntry(entry))

      if (result.success) {
        showToast('Asiento contabilizado correctamente')
        setTimeout(() => {
          window.dispatchEvent(new Event('refresh'))
        }, 100)
      } else {
        showToast(result.error || 'Error al contabilizar el asiento')
      }
    })
  })
}

function showToast(message) {
  const toast = document.querySelector('#toast')
  if (toast) {
    toast.textContent = message
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 2600)
  }
}