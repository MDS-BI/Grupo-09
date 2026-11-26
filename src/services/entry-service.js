import { loadCollection, saveCollection } from '../storage.js'
import { validateEntryHeader, validateEntryLines, ENTRY_STATE } from '../domain/entry.js'
import { logEvent } from './audit-service.js'

let _pendingEntry = null

export function setPendingEntry(entry) {
  _pendingEntry = entry
}

export function getPendingEntry() {
  return _pendingEntry
}

export function clearPendingEntry() {
  _pendingEntry = null
}

const IMMUTABLE_STATES = [ENTRY_STATE.CONTABILIZADA, ENTRY_STATE.REVERTIDA]

export function validateEntry(entry) {
  const headerErrors = validateEntryHeader(entry)
  const lineErrors = validateEntryLines(entry.detalles)

  const allErrors = [...headerErrors, ...lineErrors]
  return { valid: allErrors.length === 0, errors: allErrors }
}

export function addEntry(entry) {
  const record = {
    ...entry,
    id: entry.id || `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    detalles: entry.detalles || [],
    creado_en: new Date().toISOString(),
  }
  const entries = loadCollection('entries').records
  entries.push(record)
  saveCollection('entries', entries)
  return { success: true, entry: record }
}

export function saveEntry(entry) {
  const entries = loadCollection('entries').records
  const existingEntry = entries.find((item) => item.id === entry.id)

  if (existingEntry && IMMUTABLE_STATES.includes(existingEntry.estado)) {
    return { success: false, error: 'No se puede editar un asiento contabilizado o revertido' }
  }

  const validation = validateEntry(entry)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const accounts = loadCollection('accounts').records
  const departments = loadCollection('@erp-department-base').records

  if (accounts.length > 0) {
    for (const line of entry.detalles) {
      const account = accounts.find((a) => a.id === line.id_cuenta)
      if (!account) {
        return { success: false, error: `Cuenta ${line.id_cuenta} no encontrada` }
      }
      if (!account.activa) {
        return { success: false, error: `Cuenta ${line.id_cuenta} está inactiva` }
      }
      if (!account.acepta_movimientos) {
        return { success: false, error: `Cuenta ${line.id_cuenta} no acepta movimientos` }
      }
    }
  }

  if (departments.length > 0) {
    for (const line of entry.detalles) {
      if (line.id_departamento && !departments.some((d) => d.id === line.id_departamento)) {
        return { success: false, error: 'Departamento no encontrado' }
      }
    }
  }

  let debeTotal = 0
  let haberTotal = 0

  for (const line of entry.detalles) {
    if (line.monto_debe > 0 && line.monto_haber === 0) {
      debeTotal += line.monto_debe
    } else if (line.monto_haber > 0 && line.monto_debe === 0) {
      haberTotal += line.monto_haber
    }
  }

  if (Math.round(debeTotal * 10000) / 10000 !== Math.round(haberTotal * 10000) / 10000) {
    return { success: false, error: 'El total de Debe debe ser exactamente igual al total de Haber' }
  }

  const completedEntry = {
    ...entry,
    id: entry.id || `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    estado: entry.estado || ENTRY_STATE.BORRADOR,
    detalles: entry.detalles.map((line) => ({
      ...line,
      _id: line._id || `det-${entry.id}-${line.numero_linea}`,
      _timestamp: new Date().toISOString(),
    })),
    creado_en: entry.creado_en || new Date().toISOString(),
    aprobado_en: entry.aprobado_en || null,
    contabilizado_en: entry.estado === ENTRY_STATE.CONTABILIZADA ? new Date().toISOString() : null,
  }

  const currentEntries = loadCollection('entries').records
  const index = currentEntries.findIndex((item) => item.id === completedEntry.id)
  if (index === -1) currentEntries.push(completedEntry)
  else currentEntries[index] = completedEntry
  saveCollection('entries', currentEntries)

  logEvent({
    type: index === -1 ? 'entry_creation' : 'entry_update',
    entityType: 'entry',
    entityId: completedEntry.id,
    previousState: existingEntry?.estado || null,
    newState: completedEntry.estado,
  })

  return { success: true, entry: completedEntry }
}

export function approveEntry(entry, approverId) {
  const allowedTransitions = {
    [ENTRY_STATE.BORRADOR]: ENTRY_STATE.PENDIENTE,
    [ENTRY_STATE.PENDIENTE]: ENTRY_STATE.APROBADA,
    [ENTRY_STATE.APROBADA]: ENTRY_STATE.CONTABILIZADA,
  }
  const nextState = allowedTransitions[entry.estado]
  if (!nextState) return { success: false, error: 'Transición no permitida' }

  const updated = {
    ...entry,
    estado: nextState,
    id_usuario_aprobador: approverId || entry.id_usuario_aprobador || null,
    aprobado_en: nextState === ENTRY_STATE.APROBADA ? new Date().toISOString() : entry.aprobado_en,
  }
  const result = saveEntry(updated)
  if (!result.success) return result

  logEvent({
    type:
      nextState === ENTRY_STATE.PENDIENTE
        ? 'submit'
        : nextState === ENTRY_STATE.CONTABILIZADA
          ? 'post'
          : 'approve',
    entityType: 'entry',
    entityId: result.entry.id,
    previousState: entry.estado,
    newState: nextState,
    metadata: { approverId },
  })
  return result
}

export function reverseEntry(entryId) {
  const entries = loadCollection('entries').records
  const entry = entries.find((item) => item.id === entryId)

  if (!entry) {
    return { success: false, error: 'Asiento no encontrado' }
  }

  const existingReverse = entries.find((item) => item.id_transaccion_revertida === entryId)
  if (existingReverse) {
    return { success: false, error: 'Ya existe una reversa para este asiento' }
  }

  if (entry.estado !== ENTRY_STATE.CONTABILIZADA) {
    return { success: false, error: 'Solo se pueden revertir asientos Contabilizadas' }
  }

  const swappedLines = entry.detalles.map((line) => ({
    id_cuenta: line.id_cuenta,
    id_departamento: line.id_departamento,
    numero_linea: line.numero_linea,
    monto_debe: line.monto_haber > 0 ? line.monto_haber : 0,
    monto_haber: line.monto_debe > 0 ? line.monto_debe : 0,
    glosa: `${line.glosa || ''} (Reversa)`,
  }))

  const reverse = {
    id: `entry-reverse-${Date.now()}`,
    fecha_contable: new Date().toISOString().split('T')[0],
    tipo_documento: 'REVERSA',
    numero_documento: `REV-${entry.id}`,
    descripcion: `Reversa de asiento ${entry.id}`,
    moneda: entry.moneda,
    estado: ENTRY_STATE.REVERTIDA,
    id_usuario_creador: entry.id_usuario_aprobador || entry.id_usuario_creador,
    id_usuario_aprobador: null,
    id_usuario_contabilizador: null,
    id_transaccion_revertida: entryId,
    detalles: swappedLines,
    creado_en: new Date().toISOString(),
    aprobado_en: null,
    contabilizado_en: null,
  }

  const currentEntries = loadCollection('entries').records
  currentEntries.push(reverse)
  const originalIndex = currentEntries.findIndex((item) => item.id === entryId)
  if (originalIndex >= 0) {
    currentEntries[originalIndex].estado = ENTRY_STATE.REVERTIDA
    currentEntries[originalIndex].id_transaccion_revertida = reverse.id
  }
  saveCollection('entries', currentEntries)

  logEvent({
    type: 'reverse',
    entityType: 'entry',
    entityId: entryId,
    previousState: ENTRY_STATE.CONTABILIZADA,
    newState: ENTRY_STATE.REVERTIDA,
    metadata: { reverseId: reverse.id },
  })

  return { success: true, reverseEntry: reverse }
}
