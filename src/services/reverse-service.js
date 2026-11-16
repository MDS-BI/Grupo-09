import { loadCollection, saveCollection } from '../storage.js'
import { ENTRY_STATE, logEvent } from './audit-service.js'
import { saveEntry } from './entry-service.js'

export function reverseEntry(entryId) {
  const entries = loadCollection('entries').records
  const entry = entries.find((e) => e.id === entryId)

  if (!entry) {
    return { success: false, error: 'Asiento no encontrado' }
  }

  // Reject reversals of non-Contabilizada entries
  if (entry.estado !== ENTRY_STATE.CONTABILIZADA) {
    return { success: false, error: 'Solo se pueden revertir asientos Contabilizadas' }
  }

  // Check for existing reverse
  const existingReverse = entries.find(
    (e) => e.id_transaccion_revertida === entryId
  )
  if (existingReverse) {
    return { success: false, error: 'Ya existe una reversa para este asiento' }
  }

  // Swap Debe/Haber for each line
  const swappedLines = entry.detalles.map((line) => ({
    id_cuenta: line.id_cuenta,
    id_departamento: line.id_departamento,
    numero_linea: line.numero_linea,
    monto_debe: line.monto_haber >= 0 ? line.monto_haber : 0,
    monto_haber: line.monto_debe > 0 ? line.monto_debe : 0,
    glosa: line.glosa + '(Reversa)',
  }))

  // Create the reverse entry
  const reverseEntry = {
    id: `entry-reverse-${Date.now()}`,
    fecha_contable: new Date().toISOString().split('T')[0],
    tipo_documento: 'REVERSA',
    numero_documento: `REV-${entry.id.split('-')[1]}`,
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

  // Save both entries atomically
  const entries = loadCollection('entries').records
  entries.push(reverseEntry)

  // Mark the original entry as reversed
  const originalIndex = entries.findIndex((e) => e.id === entryId)
  if (originalIndex >= 0) {
    entries[originalIndex].estado = ENTRY_STATE.REVERTIDA
    entries[originalIndex].id_transaccion_revertida = reverseEntry.id
  }

  saveCollection('entries', entries)

  // Log audit events
  logEvent({
    type: 'reverse',
    entityType: 'entry',
    entityId: entryId,
    previousState: ENTRY_STATE.CONTABILIZADA,
    newState: ENTRY_STATE.REVERTIDA,
    metadata: { reverseId: reverseEntry.id },
  })

  logEvent({
    type: 'reverse',
    entityType: 'entry',
    entityId: reverseEntry.id,
    previousState: 'Nuevo',
    newState: ENTRY_STATE.REVERTIDA,
    metadata: { originalId: entryId },
  })

  return { success: true, reverseEntry }
}