import { ENTRY_STATE } from '../domain/entry.js'
import { logEvent } from './audit-service.js'
import { saveEntry } from './entry-service.js'

const ALLOWED_TRANSITIONS = {
  [ENTRY_STATE.BORRADOR]: [ENTRY_STATE.PENDIENTE],
  [ENTRY_STATE.PENDIENTE]: [ENTRY_STATE.APROBADA],
  [ENTRY_STATE.APROBADA]: [ENTRY_STATE.CONTABILIZADA],
}

export function isValidTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from]
  if (!allowed) return false
  return allowed.includes(to)
}

export function canApprove(userRole, currentState) {
  if (userRole === 'admin') return true
  if (userRole === 'contador' && currentState === ENTRY_STATE.PENDIENTE) return true
  return false
}

export function approveEntry(entry, approverId) {
  if (!canApprove(approverRole(approverId), entry.estado)) {
    return { success: false, error: 'Usuario sin permiso para aprobar' }
  }

  if (!isValidTransition(entry.estado, ENTRY_STATE.APROBADA)) {
    return { success: false, error: 'Transición no permitida' }
  }

  const updatedEntry = {
    ...entry,
    estado: ENTRY_STATE.APROBADA,
    id_usuario_aprobador: approverId,
    aprobado_en: new Date().toISOString(),
  }

  const result = saveEntry(updatedEntry)
  if (result.success) {
    logEvent({
      type: 'approve',
      entityType: 'entry',
      entityId: result.entry.id,
      previousState: entry.estado,
      newState: ENTRY_STATE.APROBADA,
      metadata: { approverId },
    })
  }
  return result
}

function approverRole(_approverId) {
  // In a real app, this would look up the user's role
  // For now, default to 'contador'
  return 'contador'
}