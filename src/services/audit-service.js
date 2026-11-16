const AUDIT_LOG_KEY = '@erp-audit-log'
const SCHEMA_VERSION = '1.0'

function generateId() {
  return 'audit-' + Math.random().toString(36).substr(2, 9)
}

function getTimestamp() {
  return new Date().toISOString()
}

function loadAuditLog() {
  const envelopeString = localStorage.getItem(AUDIT_LOG_KEY)
  if (!envelopeString) return { records: [], schemaVersion: SCHEMA_VERSION }
  try {
    const envelope = JSON.parse(envelopeString)
    return {
      records: envelope.records || [],
      schemaVersion: envelope.schemaVersion || SCHEMA_VERSION
    }
  } catch {
    return { records: [], schemaVersion: SCHEMA_VERSION }
  }
}

function saveAuditLogRecord(record) {
  const envelope = loadAuditLog()
  const newRecord = {
    ...record,
    id: generateId(),
    timestamp: getTimestamp(),
  }
  envelope.records = [...envelope.records, newRecord]
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(envelope))
  return newRecord
}

export function logEvent({ type, entityType, entityId, previousState, newState, metadata }) {
  return saveAuditLogRecord({
    type,
    entityType,
    entityId,
    previousState,
    newState,
    metadata,
  })
}

export function getEvents(filters = {}) {
  const { log } = loadAuditLog()
  
  return log.filter(event => {
    if (filters.entityId && event.entityId !== filters.entityId) return false
    if (filters.type && event.type !== filters.type) return false
    if (filters.from && event.timestamp < filters.from) return false
    if (filters.to && event.timestamp > filters.to) return false
    return true
  }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

export function getPerEntryHistory(entityId) {
  const events = getEvents({ entityId })
  return events
}

export function getEventsByType(type) {
  const events = loadAuditLog().records || []
  return events.filter(e => e.type === type)
}