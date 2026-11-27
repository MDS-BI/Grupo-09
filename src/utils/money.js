export const PRECISION = 4;
const SCALE = 10 ** PRECISION;

function toScaledInt(value) {
  if (value === null || value === undefined || value === '') {
    return { scaled: null, error: 'INVALID_AMOUNT' };
  }
  const raw = String(value).trim();
  if (raw === '') return { scaled: null, error: 'INVALID_AMOUNT' };

  const negative = raw.startsWith('-');
  const unsigned = negative || raw.startsWith('+') ? raw.slice(1) : raw;
  const parts = unsigned.split('.');
  if (parts.length > 2) return { scaled: null, error: 'INVALID_AMOUNT' };

  const integerPart = parts[0] === '' ? '0' : parts[0];
  let decimalPart = parts.length > 1 ? parts[1] : '';

  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(decimalPart)) {
    return { scaled: null, error: 'INVALID_AMOUNT' };
  }
  if (decimalPart.length > PRECISION) {
    return { scaled: null, error: `AMOUNT_EXCEEDS_PRECISION_${decimalPart.length}` };
  }
  while (decimalPart.length < PRECISION) decimalPart += '0';

  const digits = `${integerPart}${decimalPart}`;
  const magnitude = parseInt(digits, 10);
  if (Number.isNaN(magnitude)) return { scaled: null, error: 'INVALID_AMOUNT' };

  return { scaled: negative ? -magnitude : magnitude };
}

function fromScaledInt(scaled) {
  return scaled / SCALE;
}

export function parseAmount(value) {
  const { scaled, error } = toScaledInt(value);
  if (error) return { amount: null, error };
  return { amount: fromScaledInt(scaled) };
}

export function formatAmount(amount) {
  const { scaled, error } = toScaledInt(amount);
  const safeScaled = error ? 0 : scaled;
  const sign = safeScaled < 0 ? '-' : '';
  const absScaled = Math.abs(safeScaled);
  const integer = Math.floor(absScaled / SCALE);
  const decimal = String(absScaled % SCALE).padStart(PRECISION, '0');
  return `${sign}${integer}.${decimal}`;
}

export function add(a, b) {
  const pa = toScaledInt(a);
  const pb = toScaledInt(b);
  if (pa.error || pb.error) {
    return { result: null, error: pa.error || pb.error };
  }
  return { result: fromScaledInt(pa.scaled + pb.scaled) };
}

export function subtract(a, b) {
  const pa = toScaledInt(a);
  const pb = toScaledInt(b);
  if (pa.error || pb.error) {
    return { result: null, error: pa.error || pb.error };
  }
  return { result: fromScaledInt(pa.scaled - pb.scaled) };
}

// `b` is treated as a plain numeric factor (e.g. a quantity or rate), not a
// second monetary amount, which keeps the scaled integer in a safe range.
export function multiply(a, b) {
  const pa = toScaledInt(a);
  if (pa.error) return { result: null, error: pa.error };
  const factor = Number(b);
  if (!Number.isFinite(factor)) return { result: null, error: 'INVALID_AMOUNT' };
  return { result: fromScaledInt(Math.round(pa.scaled * factor)) };
}

export function divide(a, b) {
  const pa = toScaledInt(a);
  if (pa.error) return { result: null, error: pa.error };
  const divisor = Number(b);
  if (!Number.isFinite(divisor)) return { result: null, error: 'INVALID_AMOUNT' };
  if (divisor === 0) return { result: null, error: 'DIVISION_BY_ZERO' };
  return { result: fromScaledInt(Math.round(pa.scaled / divisor)) };
}

// Sums a list of amounts using exact integer-cents arithmetic, avoiding the
// accumulated floating-point drift of repeated `+=` on parsed decimals.
export function sumExact(values) {
  let total = 0;
  for (const value of values) {
    const { scaled, error } = toScaledInt(value);
    if (error) return { total: null, error };
    total += scaled;
  }
  return { total: fromScaledInt(total), error: null };
}

export function amountsEqual(a, b) {
  const pa = toScaledInt(a);
  const pb = toScaledInt(b);
  if (pa.error || pb.error) return false;
  return pa.scaled === pb.scaled;
}
