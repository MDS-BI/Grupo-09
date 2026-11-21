import { loadCollection } from '../storage.js'

export function computeDepartmentTotals({ from, to }) {
  const entries = loadCollection('entries').records
  const departments = loadCollection('@erp-department-base').records
  const accounts = new Map(loadCollection('accounts').records.map((account) => [account.id, account]))

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
    for (const line of entry.detalles) {
      const account = accounts.get(line.id_cuenta)

      // Check if this line has a department
      if (line.id_departamento) {
        const deptId = line.id_departamento
        if (!totals[deptId]) totals[deptId] = { ingresos: 0, gastos: 0, saldoNeto: 0 }

        if (line.monto_debe > 0 && line.monto_haber === 0) {
          totals[deptId].gastos += line.monto_debe
          if (!account) totals[deptId].ingresos += line.monto_debe
        } else if (line.monto_haber > 0 && line.monto_debe === 0) {
          totals[deptId].ingresos += line.monto_haber
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