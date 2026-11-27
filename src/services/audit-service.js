import { loadCollection, appendAuditRecord } from '../storage.js';

const AUDIT_COLLECTION = 'audit-log';

function getTimestamp() {
  return new Date().toISOString();
}

export function logEvent({ type, entityType, entityId, previousState, newState, timestamp, metadata }) {
  return appendAuditRecord({
    type,
    entityType,
    entityId,
    previousState,
    newState,
    timestamp: timestamp || getTimestamp(),
    metadata,
  });
}

export function getEvents(filters = {}) {
  return loadCollection(AUDIT_COLLECTION)
    .records.filter((event) => {
      if (filters.entityId && event.entityId !== filters.entityId) return false;
      if (filters.type && event.type !== filters.type) return false;
      if (filters.from && event.timestamp < filters.from) return false;
      if (filters.to && event.timestamp > filters.to) return false;
      return true;
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function getPerEntryHistory(entityId) {
  return getEvents({ entityId }).reverse();
}

export function getEventsByType(type) {
  return getEvents({ type });
}
