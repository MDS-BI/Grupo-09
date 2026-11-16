import { aggregatePostedEntries } from './metrics-service.js'
import { loadCollection } from '../storage.js'

export function computeDepartmentTotals({ from, to }) {
  const entries = loadCollection('entries').records
  const departments = loadCollection('@erp-department-base').records
  const accounts = loadCollection('accounts').records

  const postedEntries = entries.filter(
    (entry) => entry.estado === 'Contabilizada' && entry.fecha_contable >= from && entry.fecha_contable <= to
  )

  // Initialize totals for all departments + "Sin departamento"
  const totals = {}

  // Add "Sin departamento" bucket
  totals['Sin departamento'] = { ingresos: 0, gastos: 0, saldoNeto: 0 }

  // Initialize all departments
  departments.forEach((dept) => {
    totals[dept.id] = { ingresos: 0, gastos: 0, saldoNeto: 0 }
  })

  // Accumulate by department
  for (const entry of postedEntries) {
    let deptId = null

    for (const line of entry.detalles) {
      const account = accounts.find((a) => a.id === line.id_cuenta)
      if (!account) continue

      // Check if this line has a department
      if (line.id_departamento) {
        deptId = line.id_departamento
        // Determine if it's ingreso or gasto based on account type and side
        const esEfectivo = account.es_efectivo === true

        if (line.monto_debe > 0 && line.monto_haber === 0) {
          // Debe side
          if (esEfectivo) {
            totals[deptId].gastos += line.monto_debe
          } else {
            totals[deptId].gastos += line.monto_debe
          }
        } else if (line.monto_haber > 0 && line.monto_debe === 0) {
          // Haber side
          if (esEfectivo) {
            totals[deptId].ingresos += line.monto_haber
          } else {
            totals[deptId].ingresos += line.monto_haber
          }
        }
      } else {
        // Line without department goes to "Sin departamento"
        if (line.monto_debe > 0 && line.monto_haber === 0) {
          totals['Sin departamento'].gastos += line.monto_debe
        } else if (line.monto_haber > 0 && line.monto_debe === 0) {
          totals['Sin departamento'].ingresos += line.monto_haber
        }
      }
    }
  }

  // Calculate saldo neto for each
  const result = {}
  Object.keys(totals).forEach((deptId) => {
    const t = totals[deptId]
    t.saldoNeto = +(t.ingresos - t.gastos).toFixed(4)
    result[deptId] = {
      ingresos: +t.ingresos.toFixed(4),
      gastos: +t.gastos.toFixed(4),
      saldoNeto: t.saldoNeto,
    }
  })

  return result
}