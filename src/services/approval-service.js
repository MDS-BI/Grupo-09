import { ENTRY_STATE } from '../domain/entry.js';
import { getCurrentUser, getUserById } from './auth-service.js';

const ALLOWED_TRANSITIONS = {
  [ENTRY_STATE.BORRADOR]: [ENTRY_STATE.PENDIENTE],
  [ENTRY_STATE.PENDIENTE]: [ENTRY_STATE.APROBADA],
  [ENTRY_STATE.APROBADA]: [ENTRY_STATE.CONTABILIZADA],
};

export function isValidTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function canApprove(userRole, currentState) {
  if (userRole === 'admin') return true;
  if (userRole === 'contador' && currentState === ENTRY_STATE.PENDIENTE) return true;
  return false;
}

// Approving/posting an entry is executed by entry-service.js's approveEntry,
// which calls canApprove() above before applying the transition — this module
// used to also implement its own approveEntry; that duplicate was removed to
// keep a single canonical implementation (see entry-service.js).
export function approverRole(approverId) {
  const user = approverId ? getUserById(approverId) : getCurrentUser();
  return user?.role ?? null;
}
