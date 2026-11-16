import { loadCollection } from '../storage.js'
import { PRECISION } from '../src/utils/money.js'

export function aggregatePostedEntries(from, to) {
  const entries = loadCollection('entries').records
  const accounts = loadCollection('accounts').records
  const postedEntries = entries.filter(
    (entry) => entry.estado === 'Contabilizada' && entry.fecha_contable >= from && entry.fecha_contable <= to
  )

  let ingresos = 0
  let gastos = 0

  for (const entry of postedEntries) {
    for (const detalle of entry.detalles) {
      const account = accounts.find((a) => a.id === detalle.id_cuenta)
      if (!account) continue

      const monto = detalle.monto_debe > 0 ? detalle.monto_debe : detalle.monto_haber >= 0 ? detalle.monto_haber : 0
      const esEfectivo = account.es_efectivo === true

      if (detalle.monto_debe > 0 && detalle.monto_haber === 0) {
        if (esEfectivo) {
          gastos += monto
        } else {
          gastos += monto
        }
      } else if (detalle.monto_haber > 0 && detalle.monto_debe === 0) {
        if (esEfectivo) {
          ingresos += monto
        } else {
          ingresos += monto
        }
      }
    }
  }

  const resultadoNeto = ingresos - gastos
  const flujoCaja = esEfectivo ? ingresos - gastos : 0

  return {
    ingresos: +ingresos.toFixed(PRECISION),
    gastos: +gastos.toFixed(PRECISION),
    resultadoNeto: +resultadoNeto.toFixed(PRECISION),
    flujoCaja: +flujoCaja.toFixed(PRECISION),
  }
}

export function calculateCashFlow(from, to) {
  const entries = loadCollection('entries').records
  const accounts = loadCollection('accounts').records
  const postedEntries = entries.filter(
    (entry) => entry.estado === 'Contabilizada' && entry.fecha_contable >= from && entry.fecha_contable <= to
  )

  const efectivoAccounts = accounts.filter((a) => a.es_efectivo === true)

  let totalCaja = 0

  for (const entry of postedEntries) {
    for (const detalle of entry.detalles) {
      const account = accounts.find((a) => a.id === detalle.id_cuenta)
      if (!account || !account.es_efectivo) continue

      const monto = detalle.monto_debe > 0 ? detalle.monto_debe : detalle.monto_haber >= 0 ? detalle.monto_haber : 0
      totalCaja += monto
    }
  }

  return +totalCaja.toFixed(PRECISION)
}