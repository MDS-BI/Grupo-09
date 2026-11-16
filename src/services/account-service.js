import { addAccount, updateAccount, deleteAccount, loadCollection } from '../storage.js'
import { ACCOUNT_STATE } from '../domain/account.js'

let _checkAccountIntegrity

export function setCheckAccountIntegrity(validator) {
  _checkAccountIntegrity = validator
}

export function checkAccountIntegrity(accountId) {
  const accounts = loadCollection('accounts').records
  const entries = loadCollection('entries').records
  
  // Check references in any entry state (Borrador, Pendiente, Aprobada, Contabilizada, Revertida)
  const hasReferences = entries.some(
    (entry) =>
      entry.estado !== 'Contabilizada' && entry.estado !== 'Revertida' &&
      entry.detalles.some((line) => line.id_cuenta === accountId)
  )
  
  // Check self-parent (a account cannot be its own parent)
  const account = accounts.find((a) => a.id === accountId)
  const hasSelfParent = account && account.id_cuenta_padre === accountId
  
  // Check indirect cycles by traversing the hierarchy
  const hasCycle = checkForCycle(accountId, new Set())
  
  if (hasReferences) {
    return { allowed: false, reason: 'No se puede eliminar: la cuenta está referenciada en asientos', suggestedAction: 'desactivar' }
  }
  
  if (hasSelfParent) {
    return { allowed: false, reason: 'No se puede eliminar: la cuenta es su propio padre', suggestedAction: 'desactivar' }
  }
  
  if (hasCycle) {
    return { allowed: false, reason: 'No se puede eliminar: hay un ciclo en la jerarquía', suggestedAction: 'desactivar' }
  }
  
  return { allowed: true, reason: null, suggestedAction: null }
}

function checkForCycle(accountId, visited) {
  if (visited.has(accountId)) {
    return true
  }
  visited.add(accountId)
  
  const accounts = loadCollection('accounts').records
  const account = accounts.find((a) => a.id === accountId)
  
  if (!account || !account.id_cuenta_padre) {
    return false
  }
  
  return checkForCycle(account.id_cuenta_padre, visited)
}

export function addAccount(account) {
  const integrityResult = checkAccountIntegrity()
  if (integrityResult.allowed === false) {
    return { success: false, error: integrityResult.reason }
  }

  const accounts = loadCollection('accounts').records
  const codeExists = accounts.some((a) => a.codigo === account.codigo)

  if (codeExists) {
    return { success: false, error: 'Ya existe una cuenta con ese código' }
  }

  return addAccount(account)
}

export function updateAccount(id, updates) {
  const integrityResult = checkAccountIntegrity()
  if (integrityResult.allowed === false) {
    return { success: false, error: integrityResult.reason }
  }

  return updateAccount(id, updates)
}

export function deleteAccount(id) {
  const integrityResult = checkAccountIntegrity(id)
  if (integrityResult.allowed === false) {
    return { success: false, error: integrityResult.reason }
  }

  const accounts = loadCollection('accounts').records
  const account = accounts.find((a) => a.id === id)

  if (!account) {
    return { success: false, error: 'Cuenta no encontrada' }
  }

  if (!account.activa) {
    return { success: false, error: 'No se puede eliminar una cuenta inactiva, use desactivar' }
  }

  const hasReferences = accounts.some((a) => a.id_cuenta_padre === id || (a.id_cuenta_padre && a.id_cuenta_padre !== account.id_cuenta_padre))
  
  if (hasReferences) {
    return { success: false, error: 'No se puede eliminar: la cuenta tiene subcuentas', suggestedAction: 'desactivar' }
  }

  return deleteAccount(id)
}

export function setAccounts(accounts) {
  saveCollection('accounts', accounts)
}