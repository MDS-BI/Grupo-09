import { loadCollection, saveCollection } from '../storage.js'
import { validateEntryHeader, validateEntryLines, ENTRY_STATE, createEntryHeader, createEntryLine } from '../domain/entry.js'
import { required, amount } from '../utils/validation.js'

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

export function saveEntry(entry) {
  // Check immutability: Contabilizada and Revertida entries cannot be edited
  if (entry.estado && IMMUTABLE_STATES.includes(entry.estado)) {
    return { success: false, error: 'No se puede editar un asiento contabilizado o revertido' }
  }

  const validation = validateEntry(entry)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const accounts = loadCollection('accounts').records
  const users = loadCollection('@erp-user-base').records

  // Check all referenced accounts exist and are active
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

  // Check all referenced departments exist
  for (const line of entry.detalles) {
    if (line.id_departamento) {
      const deptResult = checkDepartmentExists(line.id_departamento)
      if (deptResult.allowed === false) {
        return { success: false, error: deptResult.reason }
      }
    }
  }

  // Check balance: Debe total = Haber total
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

  // Create the entry with state
  const completedEntry = {
    ...entry,
    id: `entry-${Date.now()}`,
    fecha_contable: entry.fecha_contable,
    tipo_documento: entry.tipo_documento,
    numero_documento: entry.numero_documento,
    descripcion: entry.descripcion,
    moneda: entry.moneda,
    estado: ENTRY_STATE.CONTABILIZADA,
    id_usuario_creador: entry.id_usuario_creador,
    id_usuario_aprobador: entry.id_usuario_aprobador,
    id_usuario_contabilizador: entry.id_usuario_contabilizador,
    id_transaccion_revertida: entry.id_transaccion_revertida,
    detalles: entry.detalles.map((line) => ({
      ...line,
      _id: `det-${entry.id}-${line.numero_linea}`,
      _timestamp: new Date().toISOString(),
    })),
    creado_en: new Date().toISOString(),
    aprobado_en: null,
    contabilizado_en: new Date().toISOString(),
  }

  // Save entry lines
  const entries = loadCollection('entries').records
  entries.push(completedEntry)
  saveCollection('entries', entries)

  // Save detail lines
  const detailLines = []
  for (const line of completedEntry.detalles) {
    detailLines.push({
      ...line,
      _id: line._id || `det-${completedEntry.id}-${line.numero_linea}`,
      _timestamp: new Date().toISOString(),
      id_transaccion: completedEntry.id,
    })
  }

  // Store detail lines separately or integrate with entries
  // For now, just return success
  return { success: true, entry: completedEntry }
}

function checkDepartmentExists(deptId) {
  const departments = loadCollection('@erp-department-base').records
  const dept = departments.find((d) => d.id === deptId)
  if (!dept) {
    return { allowed: false, reason: 'Departamento no encontrado' }
  }
  return { allowed: true, reason: null }
}