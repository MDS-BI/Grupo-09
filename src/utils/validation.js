export const VALIDATION = {
  REQUIRED: 'REQUIRED',
  INVALID_ACCOUNT_CODE: 'INVALID_ACCOUNT_CODE',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  NEGATIVE_AMOUNT: 'NEGATIVE_AMOUNT',
  ZERO_AMOUNT: 'ZERO_AMOUNT',
  EXCEEDS_PRECISION: 'EXCEEDS_PRECISION',
}

export function required(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: `${fieldName} es requerido` }
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, message: `${fieldName} es requerido` }
  }
  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, message: `${fieldName} es requerido` }
  }
  return { valid: true }
}

export function accountCode(code) {
  if (!/^\d+(\.\d+)?$/.test(code)) {
    return { valid: false, message: 'El código de cuenta debe ser numérico' }
  }
  return { valid: true }
}

function isValidISO4217(currency) {
  if (!currency || typeof currency !== 'string') {
    return { valid: false }
  }
  const currencyCode = currency.trim().toUpperCase()
  if (currencyCode.length !== 3) {
    return { valid: false }
  }
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return { valid: false }
  }
  return { valid: true, currencyCode }
}

export function currency(value) {
  return isValidISO4217(value)
}

export function date(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, message: 'Fecha inválida' }
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(value)) {
    return { valid: false, message: 'Fecha debe tener formato YYYY-MM-DD' }
  }
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return { valid: false, message: 'Fecha inválida' }
  }
  return { valid: true }
}

export function amount(value) {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: null }
  }
  const num = Number(value)
  if (isNaN(num)) {
    return { valid: false, message: 'Importe inválido' }
  }
  if (num < 0) {
    return { valid: false, message: 'El importe no puede ser negativo' }
  }
  if (num === 0) {
    return { valid: false, message: 'El importe no puede ser cero' }
  }
  const decimalPart = String(value).split('.')[1]
  if (decimalPart && decimalPart.length > 4) {
    return { valid: false, message: 'El importe no puede tener más de 4 decimales' }
  }
  return { valid: true }
}