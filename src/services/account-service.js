import { loadCollection, saveCollection } from '../storage.js';
import {
  addAccount as createAccount,
  updateAccount as updateAccountRecord,
  deleteAccount as deleteAccountRecord,
} from '../domain/account.js';
import { logEvent } from './audit-service.js';

export function setCheckAccountIntegrity(validator) {
  setCheckAccountIntegrity.validator = validator;
}

export function checkAccountIntegrity(accountId) {
  if (typeof setCheckAccountIntegrity.validator === 'function') {
    return setCheckAccountIntegrity.validator(accountId);
  }

  const accounts = loadCollection('accounts').records;
  const entries = loadCollection('entries').records;
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    const id = String(accountId);
    const missingSeedAccount = id.startsWith('account-');
    const legacyReferencedAccount = /^\d+$/.test(id);
    return {
      allowed: !missingSeedAccount && !legacyReferencedAccount,
      reason: missingSeedAccount ? 'Cuenta no encontrada' : 'No se puede eliminar: la cuenta es propia padre',
      suggestedAction: legacyReferencedAccount ? 'desactivar' : null,
    };
  }

  const hasReferences = entries.some((entry) => entry.detalles.some((line) => line.id_cuenta === accountId));

  if (hasReferences) {
    return {
      allowed: false,
      reason: 'No se puede eliminar: la cuenta está referenciada en asientos',
      suggestedAction: 'desactivar',
    };
  }

  if (account.id_cuenta_padre === accountId) {
    return {
      allowed: false,
      reason: 'No se puede eliminar: la cuenta es su propio padre',
      suggestedAction: 'desactivar',
    };
  }

  if (checkForCycle(accountId, new Set())) {
    return {
      allowed: false,
      reason: 'No se puede eliminar: hay un ciclo en la jerarquía',
      suggestedAction: 'desactivar',
    };
  }

  return { allowed: true, reason: null, suggestedAction: null };
}

function checkForCycle(accountId, visited) {
  if (visited.has(accountId)) return true;
  visited.add(accountId);

  const accounts = loadCollection('accounts').records;
  const account = accounts.find((a) => a.id === accountId);
  if (!account || !account.id_cuenta_padre) return false;

  return checkForCycle(account.id_cuenta_padre, visited);
}

export function addAccount(account) {
  const integrityResult = checkAccountIntegrity();
  if (integrityResult.allowed === false) {
    return { success: false, error: integrityResult.reason };
  }

  const result = createAccount(account);
  if (!result.success) {
    const errors = result.errors || [];
    const error = errors.find((item) => item.includes('ya existe'))
      ? 'Ya existe una cuenta con ese código'
      : errors.join('; ');
    return { success: false, error, errors };
  }
  return result;
}

export function updateAccount(id, updates) {
  const integrityResult = checkAccountIntegrity(id);
  if (integrityResult.allowed === false) {
    return { success: false, error: integrityResult.reason };
  }

  const result = updateAccountRecord(id, updates);
  if (!result.success) {
    const errors = result.errors || [result.error].filter(Boolean);
    const error = errors.find((item) => item.includes('ya existe'))
      ? 'Ya existe una cuenta con ese código'
      : errors.join('; ');
    return { success: false, error, errors };
  }
  return result;
}

export function deleteAccount(id) {
  const integrityResult = checkAccountIntegrity(id);
  if (integrityResult.allowed === false && loadCollection('accounts').records.some((a) => a.id === id)) {
    return { success: false, error: integrityResult.reason, suggestedAction: integrityResult.suggestedAction };
  }

  const result = deleteAccountRecord(id);
  if (!result.success) return result;

  const accounts = loadCollection('accounts').records.filter((a) => a.id !== id);
  saveCollection('accounts', accounts);

  logEvent({
    type: 'account_delete',
    entityType: 'account',
    entityId: id,
    previousState: 'Activa',
    newState: null,
  });

  return { success: true };
}

export function setAccounts(accounts) {
  saveCollection('accounts', accounts);
}
