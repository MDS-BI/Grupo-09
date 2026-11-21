const SCHEMA_VERSION = '1.0'

const ENVELOPE_KEY = '@erp-envelope'
const AUDIT_COLLECTION = 'audit-log'
const AUDIT_STREAM_KEY = '@erp-audit-log'

function parseAuditStream() {
  const stream = getAuditStream()
  if (!stream) return []
  return stream
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function getAuditStream() {
  if (!localStorage.getItem(`${ENVELOPE_KEY}:${AUDIT_COLLECTION}`)) return ''
  return localStorage.getItem(AUDIT_STREAM_KEY) || ''
}

function appendAuditRecord(record) {
  const envelopeKey = `${ENVELOPE_KEY}:${AUDIT_COLLECTION}`
  const isFresh = !localStorage.getItem(envelopeKey)
  if (isFresh) {
    localStorage.setItem(envelopeKey, JSON.stringify({ schemaVersion: SCHEMA_VERSION, records: [] }))
    localStorage.removeItem(AUDIT_STREAM_KEY)
  }
  const stream = localStorage.getItem(AUDIT_STREAM_KEY) || ''
  const line = JSON.stringify(record)
  localStorage.setItem(AUDIT_STREAM_KEY, stream ? `${stream}\n${line}` : line)
  return record
}

function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9)
}

function getTimestamp() {
  return new Date().toISOString()
}

function loadCollection(name) {
  if (name === AUDIT_COLLECTION) {
    return { records: parseAuditStream(), schemaVersion: SCHEMA_VERSION }
  }

  const envelopeString = localStorage.getItem(`${ENVELOPE_KEY}:${name}`)
  if (!envelopeString) {
    return { records: [], schemaVersion: SCHEMA_VERSION }
  }
  try {
    const envelope = JSON.parse(envelopeString)
    if (envelope.schemaVersion) {
      // Validate and migrate if needed
      return ensureSchemaVersion(name, envelope)
    }
    // Legacy schema - migrate
    return migrateLegacyCollection(name, envelope)
  } catch {
    return { records: [], schemaVersion: SCHEMA_VERSION }
  }
}

function ensureSchemaVersion(name, envelope) {
  const records = envelope.records || []
  const version = envelope.schemaVersion || SCHEMA_VERSION
  
  if (version === SCHEMA_VERSION) {
    // Current schema - return as-is
    return { records, schemaVersion: version }
  }
  
  // Version mismatch - migrate
  return migrateCollection(name, records, version)
}

function migrateLegacyCollection(name, envelope) {
  const records = envelope.records || []
  const version = envelope.schemaVersion || SCHEMA_VERSION
  
  // Migrate based on version
 if (version === '1.0') {
    // Already on latest version, just add schemaVersion
    const migratedRecords = records.map(record => ({
      ...record,
      schemaVersion: SCHEMA_VERSION,
    }))
    return { records: migratedRecords, schemaVersion: SCHEMA_VERSION }
  }
  
  // Unknown version - treat as current
  const migratedRecords = records.map(record => ({
    ...record,
    schemaVersion: SCHEMA_VERSION,
  }))
  return { records: migratedRecords, schemaVersion: SCHEMA_VERSION }
}

function migrateCollection(name, records, _oldVersion) {
  // Migrate based on old version to current
  const migratedRecords = records.map(record => {
    // Migrate es_efectivo for legacy accounts
    if (record.es_efectivo === false && record.__esModule !== true) {
      // Legacy account - keep es_efectivo = false
    }
    return {
      ...record,
      schemaVersion: SCHEMA_VERSION,
    };
  });
  
  // Save migrated data
  saveCollection(name, migratedRecords)
  return { records: migratedRecords, schemaVersion: SCHEMA_VERSION }
}

function saveCollection(name, records) {
  if (name === AUDIT_COLLECTION) {
    const normalized = records.map((record) => ({
      ...record,
      _id: record._id || generateId(),
      _timestamp: record._timestamp || getTimestamp(),
    }))
    localStorage.setItem(
      AUDIT_STREAM_KEY,
      normalized.map((record) => JSON.stringify(record)).join('\n')
    )
    localStorage.setItem(
      `${ENVELOPE_KEY}:${AUDIT_COLLECTION}`,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, records: normalized })
    )
    return
  }

  const envelope = {
    schemaVersion: SCHEMA_VERSION,
    records: records.map(record => ({
      ...record,
      _id: record._id || generateId(),
      _timestamp: record._timestamp || getTimestamp(),
    })),
  }
  localStorage.setItem(`${ENVELOPE_KEY}:${name}`, JSON.stringify(envelope))
}

function addRecord(name, record) {
  const collection = loadCollection(name)
  const newRecord = {
    ...record,
    _id: generateId(),
    _timestamp: getTimestamp(),
  }
  collection.records.push(newRecord)
  saveCollection(name, collection.records)
  return newRecord
}

function updateRecord(name, id, updates) {
  const collection = loadCollection(name)
  const index = collection.records.findIndex(r => r._id === id)
  if (index === -1) return null
  const updated = { ...collection.records[index], ...updates, _timestamp: getTimestamp() }
  collection.records[index] = updated
  saveCollection(name, collection.records)
  return updated
}

function deleteRecord(name, id) {
  const collection = loadCollection(name)
  const index = collection.records.findIndex(r => r._id === id)
  if (index === -1) return false
  collection.records.splice(index, 1)
  saveCollection(name, collection.records)
  return true
}

globalThis.loadCollection = loadCollection

export { loadCollection, saveCollection, addRecord, updateRecord, deleteRecord, appendAuditRecord, ensureSchemaVersion, SCHEMA_VERSION }