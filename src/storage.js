const SCHEMA_VERSION = '1.0';

const ENVELOPE_KEY = '@erp-envelope';
const AUDIT_COLLECTION = 'audit-log';
const AUDIT_STREAM_KEY = '@erp-audit-log';

function parseAuditStream() {
  const stream = getAuditStream();
  if (!stream) return [];
  return stream
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getAuditStream() {
  if (!localStorage.getItem(`${ENVELOPE_KEY}:${AUDIT_COLLECTION}`)) return '';
  return localStorage.getItem(AUDIT_STREAM_KEY) || '';
}

function appendAuditRecord(record) {
  const envelopeKey = `${ENVELOPE_KEY}:${AUDIT_COLLECTION}`;
  const isFresh = !localStorage.getItem(envelopeKey);
  if (isFresh) {
    localStorage.setItem(envelopeKey, JSON.stringify({ schemaVersion: SCHEMA_VERSION, records: [] }));
    localStorage.removeItem(AUDIT_STREAM_KEY);
  }
  const stream = localStorage.getItem(AUDIT_STREAM_KEY) || '';
  const line = JSON.stringify(record);
  localStorage.setItem(AUDIT_STREAM_KEY, stream ? `${stream}\n${line}` : line);
  return record;
}

function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9);
}

function getTimestamp() {
  return new Date().toISOString();
}

// A stored record must be a non-null, non-array object. Anything else is
// treated as corrupted and excluded from the active record set, without
// touching the raw envelope on disk (nothing is discarded silently from
// localStorage itself — only from the list handed to the rest of the app).
function isValidRecordShape(record) {
  return typeof record === 'object' && record !== null && !Array.isArray(record);
}

function partitionByShape(records) {
  const valid = [];
  let invalidCount = 0;
  for (const record of Array.isArray(records) ? records : []) {
    if (isValidRecordShape(record)) valid.push(record);
    else invalidCount += 1;
  }
  return { valid, invalidCount };
}

function loadCollection(name) {
  if (name === AUDIT_COLLECTION) {
    const { valid, invalidCount } = partitionByShape(parseAuditStream());
    return { records: valid, schemaVersion: SCHEMA_VERSION, invalidCount };
  }

  const envelopeString = localStorage.getItem(`${ENVELOPE_KEY}:${name}`);
  if (!envelopeString) {
    return { records: [], schemaVersion: SCHEMA_VERSION, invalidCount: 0 };
  }
  try {
    const envelope = JSON.parse(envelopeString);
    const result = envelope.schemaVersion
      ? ensureSchemaVersion(name, envelope)
      : migrateLegacyCollection(name, envelope);
    const { valid, invalidCount } = partitionByShape(result.records);
    return { records: valid, schemaVersion: result.schemaVersion, invalidCount };
  } catch {
    return { records: [], schemaVersion: SCHEMA_VERSION, invalidCount: 0 };
  }
}

// Reports, per known collection, how many stored records failed the shape
// check above — used by the Configuración view to tell the user when data
// was preserved but excluded from calculations, instead of failing silently.
function getStorageIntegrityReport() {
  const collections = ['accounts', 'entries', '@erp-user-base', '@erp-department-base', AUDIT_COLLECTION];
  return collections.map((name) => {
    const { records, invalidCount } = loadCollection(name);
    return { name, total: records.length + invalidCount, invalid: invalidCount };
  });
}

function ensureSchemaVersion(name, envelope) {
  const records = envelope.records || [];
  const version = envelope.schemaVersion || SCHEMA_VERSION;

  if (version === SCHEMA_VERSION) {
    // Current schema - return as-is
    return { records, schemaVersion: version };
  }

  // Version mismatch - migrate
  return migrateCollection(name, records, version);
}

function migrateLegacyCollection(name, envelope) {
  const records = envelope.records || [];
  const version = envelope.schemaVersion || SCHEMA_VERSION;

  // Migrate based on version
  if (version === '1.0') {
    // Already on latest version, just add schemaVersion
    const migratedRecords = records.map((record) => ({
      ...record,
      schemaVersion: SCHEMA_VERSION,
    }));
    return { records: migratedRecords, schemaVersion: SCHEMA_VERSION };
  }

  // Unknown version - treat as current
  const migratedRecords = records.map((record) => ({
    ...record,
    schemaVersion: SCHEMA_VERSION,
  }));
  return { records: migratedRecords, schemaVersion: SCHEMA_VERSION };
}

function migrateCollection(name, records, _oldVersion) {
  // No field-shape transformations are defined between schema versions yet
  // (there has only ever been one version, '1.0'); this just re-stamps every
  // record with the current schema version without dropping any data.
  // Legacy accounts missing `es_efectivo` already default to `false` in
  // src/domain/account.js, so no explicit backfill is needed here.
  const migratedRecords = records.map((record) => ({
    ...record,
    schemaVersion: SCHEMA_VERSION,
  }));

  saveCollection(name, migratedRecords);
  return { records: migratedRecords, schemaVersion: SCHEMA_VERSION };
}

function saveCollection(name, records) {
  if (name === AUDIT_COLLECTION) {
    const normalized = records.map((record) => ({
      ...record,
      _id: record._id || generateId(),
      _timestamp: record._timestamp || getTimestamp(),
    }));
    localStorage.setItem(AUDIT_STREAM_KEY, normalized.map((record) => JSON.stringify(record)).join('\n'));
    localStorage.setItem(
      `${ENVELOPE_KEY}:${AUDIT_COLLECTION}`,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, records: normalized }),
    );
    return;
  }

  const envelope = {
    schemaVersion: SCHEMA_VERSION,
    records: records.map((record) => ({
      ...record,
      _id: record._id || generateId(),
      _timestamp: record._timestamp || getTimestamp(),
    })),
  };
  localStorage.setItem(`${ENVELOPE_KEY}:${name}`, JSON.stringify(envelope));
}

function addRecord(name, record) {
  const collection = loadCollection(name);
  const newRecord = {
    ...record,
    _id: generateId(),
    _timestamp: getTimestamp(),
  };
  collection.records.push(newRecord);
  saveCollection(name, collection.records);
  return newRecord;
}

function updateRecord(name, id, updates) {
  const collection = loadCollection(name);
  const index = collection.records.findIndex((r) => r._id === id);
  if (index === -1) return null;
  const updated = { ...collection.records[index], ...updates, _timestamp: getTimestamp() };
  collection.records[index] = updated;
  saveCollection(name, collection.records);
  return updated;
}

function deleteRecord(name, id) {
  const collection = loadCollection(name);
  const index = collection.records.findIndex((r) => r._id === id);
  if (index === -1) return false;
  collection.records.splice(index, 1);
  saveCollection(name, collection.records);
  return true;
}

globalThis.loadCollection = loadCollection;

export {
  loadCollection,
  saveCollection,
  addRecord,
  updateRecord,
  deleteRecord,
  appendAuditRecord,
  ensureSchemaVersion,
  getStorageIntegrityReport,
  SCHEMA_VERSION,
};
