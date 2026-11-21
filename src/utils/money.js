export const PRECISION = 4

export function parseAmount(value) {
  if (value === null || value === undefined || value === '') {
    return { amount: null, error: 'INVALID_AMOUNT' }
  }
  const stringValue = String(value)
  const parts = stringValue.split('.')
  let integerPart = parts[0]
  let decimalPart = parts.length > 1 ? parts[1] : ''
  if (decimalPart.length > PRECISION) {
    return { amount: null, error: `AMOUNT_EXCEEDS_PRECISION_${decimalPart.length}` }
  }
  while (decimalPart.length < PRECISION) {
    decimalPart += '0'
  }
  const total = integerPart + decimalPart
  const amount = parseInt(total, 10) / Math.pow(10, PRECISION)
  if (isNaN(amount)) {
    return { amount: null, error: 'INVALID_AMOUNT' }
  }
  return { amount }
}

export function formatAmount(amount) {
  const sign = amount < 0 ? '-' : ''
  const absAmount = Math.abs(amount)
  const integer = Math.floor(absAmount)
  const cents = Math.round((absAmount - integer) * Math.pow(10, PRECISION))
  let decimal = cents.toString()
  while (decimal.length < PRECISION) {
    decimal = '0' + decimal
  }
  return sign + integer + '.' + decimal
}

export function add(a, b) {
  const pa = parseAmount(a)
  const pb = parseAmount(b)
  if (pa.error || pb.error) {
    return { result: null, error: pa.error || pb.error }
  }
  return { result: pa.amount + pb.amount }
}

export function subtract(a, b) {
  const pa = parseAmount(a)
  const pb = parseAmount(b)
  if (pa.error || pb.error) {
    return { result: null, error: pa.error || pb.error }
  }
  return { result: pa.amount - pb.amount }
}

export function multiply(a, b) {
  const pa = parseAmount(a)
  const pb = parseAmount(b)
  if (pa.error || pb.error) {
    return { result: null, error: pa.error || pb.error }
  }
  const multiplier = pb.amount * Math.pow(10, PRECISION)
  const product = Math.round(pa.amount * multiplier) / Math.pow(10, PRECISION)
  return { result: product }
}

export function divide(a, b) {
  const pa = parseAmount(a)
  const pb = parseAmount(b)
  if (pa.error || pb.error) {
    return { result: null, error: pa.error || pb.error }
  }
  if (pb.amount === 0) {
    return { result: null, error: 'DIVISION_BY_ZERO' }
  }
  return { result: pa.amount / pb.amount }
}