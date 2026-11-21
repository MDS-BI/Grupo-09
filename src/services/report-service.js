import { loadCollection } from '../storage.js'

export function buildIncomeStatement({ from, to }) {
  const entries = loadCollection('entries').records
  const accounts = loadCollection('accounts').records

  const postedEntries = entries.filter(
    (entry) => entry.estado === 'Contabilizada' && entry.fecha_contable >= from && entry.fecha_contable <= to
  )

  let ingresos = 0
  let gastos = 0

  for (const entry of postedEntries) {
    for (const line of entry.detalles) {
      const account = accounts.find((a) => a.id === line.id_cuenta)
      if (!account) continue

      if (line.monto_debe > 0 && line.monto_haber === 0) {
        if (account.naturaleza === 'Haber') {
          ingresos += line.monto_debe
        } else {
          gastos += line.monto_debe
        }
      } else if (line.monto_haber > 0 && line.monto_debe === 0) {
        if (account.naturaleza === 'Debe') {
          gastos += line.monto_haber
        } else {
          ingresos += line.monto_haber
        }
      }
    }
  }

  const resultadoNeto = +(ingresos - gastos).toFixed(4)

  return {
    ingresos: +ingresos.toFixed(4),
    gastos: +gastos.toFixed(4),
    resultadoNeto,
  }
}

export function buildCashFlow({ from, to }) {
  const entries = loadCollection('entries').records
  const accounts = loadCollection('accounts').records

  const postedEntries = entries.filter(
    (entry) => entry.estado === 'Contabilizada' && entry.fecha_contable >= from && entry.fecha_contable <= to
  )

  let totalCaja = 0

  for (const entry of postedEntries) {
    for (const line of entry.detalles) {
      const account = accounts.find((a) => a.id === line.id_cuenta)
      if (!account || !account.es_efectivo) continue

      if (line.monto_debe > 0 && line.monto_haber === 0) {
        totalCaja += line.monto_debe
      } else if (line.monto_haber > 0 && line.monto_debe === 0) {
        totalCaja += line.monto_haber
      }
    }
  }

  return +totalCaja.toFixed(4)
}