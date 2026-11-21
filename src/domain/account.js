import { loadCollection, saveCollection } from '../storage.js'

export const ACCOUNT_STATE = {
  ACTIVA: 'Activa',
  INACTIVA: 'Inactiva',
}

export function isValidAccountCode(code) {
  if (!code || typeof code !== 'string') return false
  return /^\d+(\.\d+)?$/.test(code)
}

export function accountValidator(accounts) {
  return function validate(account) {
    const errors = []

    if (!isValidAccountCode(account.codigo)) {
      errors.push('El código de cuenta debe ser numérico')
    }

    if (accounts.some((a) => a.codigo === account.codigo && (account.id === undefined || a.id !== account.id))) {
      errors.push('El código de cuenta ya existe')
    }

    if (!account.tipo) {
      errors.push('El tipo de cuenta es requerido')
    }

    if (!account.naturaleza) {
      errors.push('La naturaleza de la cuenta es requerida')
    }

    if (account.id_cuenta_padre && account.id_cuenta_padre === account.id) {
      errors.push('Una cuenta no puede ser su propio padre')
    }

    if (account.acepta_movimientos === undefined) {
      errors.push('Es necesario indicar si la cuenta acepta movimientos')
    }

    if (account.es_efectivo === undefined) {
      account.es_efectivo = false
    }

    if (account.activa === undefined) {
      account.activa = true
    }

    return { valid: errors.length === 0, errors }
  }
}

export function addAccount(account) {
  const accounts = loadCollection('accounts').records
  const validator = accountValidator(accounts)
  const validation = validator(account)

  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const newAccount = {
    id: `account-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    codigo: account.codigo,
    nombre: account.nombre,
    tipo: account.tipo,
    naturaleza: account.naturaleza,
    id_cuenta_padre: account.id_cuenta_padre,
    acepta_movimientos: account.acepta_movimientos,
    es_efectivo: account.es_efectivo === true,
    activa: account.activa !== false,
    creado_por: 'user-1',
    creado_en: new Date().toISOString(),
  }

  saveCollection('accounts', [...accounts, newAccount])
  return { success: true, account: newAccount }
}

export function updateAccount(id, updates) {
  const accounts = loadCollection('accounts').records
  const index = accounts.findIndex((a) => a.id === id)

  if (index === -1) {
    return { success: false, error: 'Cuenta no encontrada' }
  }

  const validator = accountValidator(accounts)
  const validation = validator({ ...accounts[index], ...updates, id })

  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const updated = { ...accounts[index], ...updates, _timestamp: new Date().toISOString() }
  accounts[index] = updated
  saveCollection('accounts', accounts)
  return { success: true, account: updated }
}

export function deleteAccount(id) {
  const accounts = loadCollection('accounts').records
  const account = accounts.find((a) => a.id === id)

  if (!account) {
    return { success: false, error: 'Cuenta no encontrada' }
  }

  if (!account.activa) {
    return { success: false, error: 'No se puede eliminar una cuenta inactiva, use desactivar' }
  }

  return { success: true }
}