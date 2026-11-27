import { describe, it, expect, beforeEach } from 'vitest';
import { logEvent, getEvents, getPerEntryHistory } from '../src/services/audit-service.js';
import { loadCollection } from '../storage.js';

describe('US10: Bitácora de auditoría', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:audit-log');
  });

  describe('logEvent', () => {
    it('should log an event with required fields', () => {
      const result = logEvent({
        type: 'entry_creation',
        entityType: 'entry',
        entityId: 'entry-1',
        previousState: null,
        newState: 'Borrador',
        metadata: { userId: 'user-1' },
      });

      expect(result).toBeDefined();
    });

    it('should log event with metadata', () => {
      logEvent({
        type: 'test_event',
        entityType: 'entry',
        entityId: 'entry-1',
        metadata: { userId: 'user-1', action: 'create' },
      });

      const events = loadCollection('audit-log');
      expect(events.records.length).toBe(1);
    });
  });

  describe('getEvents', () => {
    it('should filter by entityId', () => {
      logEvent({
        type: 'test_event',
        entityType: 'entry',
        entityId: 'entry-1',
        metadata: { userId: 'user-1' },
      });

      logEvent({
        type: 'test_event',
        entityType: 'entry',
        entityId: 'entry-2',
        metadata: { userId: 'user-1' },
      });

      const eventsForEntity1 = getEvents({ entityId: 'entry-1' });
      expect(eventsForEntity1.length).toBe(1);
      expect(eventsForEntity1[0].entityId).toBe('entry-1');
    });

    it('should filter by type', () => {
      logEvent({
        type: 'entry_creation',
        entityType: 'entry',
        entityId: 'entry-1',
        metadata: { userId: 'user-1' },
      });

      logEvent({
        type: 'reverse',
        entityType: 'entry',
        entityId: 'entry-1',
        metadata: { userId: 'user-1' },
      });

      const creationEvents = getEvents({ type: 'entry_creation' });
      expect(creationEvents.length).toBe(1);
    });

    it('should filter by date range (from/to)', () => {
      // Log events with different timestamps
      const oldDate = new Date('2025-01-01').toISOString();
      const newDate = new Date('2026-01-01').toISOString();

      logEvent({
        type: 'test_event',
        entityType: 'entry',
        entityId: 'entry-1',
        timestamp: oldDate,
        metadata: { userId: 'user-1' },
      });

      logEvent({
        type: 'test_event',
        entityType: 'entry',
        entityId: 'entry-1',
        timestamp: newDate,
        metadata: { userId: 'user-1' },
      });

      const recentEvents = getEvents({ from: new Date('2025-06-01').toISOString() });
      expect(recentEvents.length).toBe(1);
      expect(recentEvents[0].timestamp).toBe(newDate);
    });

    it('should return events in chronological order', () => {
      // Log events in reverse order
      logEvent({
        type: 'test_event',
        entityType: 'entry',
        entityId: 'entry-1',
        timestamp: new Date('2026-02-01').toISOString(),
        metadata: { userId: 'user-1' },
      });

      logEvent({
        type: 'test_event',
        entityType: 'entry',
        entityId: 'entry-1',
        timestamp: new Date('2026-01-01').toISOString(),
        metadata: { userId: 'user-1' },
      });

      const events = getEvents();
      expect(events[0].timestamp).toBe(new Date('2026-01-01').toISOString());
      expect(events[1].timestamp).toBe(new Date('2026-02-01').toISOString());
    });
  });

  describe('getPerEntryHistory', () => {
    it('should return filtered query of per-entry history', () => {
      logEvent({
        type: 'entry_creation',
        entityType: 'entry',
        entityId: 'entry-1',
        metadata: { userId: 'user-1' },
      });

      const history = getPerEntryHistory('entry-1');
      expect(history.length).toBe(1);
      expect(history[0].entityId).toBe('entry-1');
    });
  });
});
