import { loadCollection } from '../storage.js'

export function filterEntries(filters = {}) {
  const entries = loadCollection('entries').records
  
  return entries.filter(entry => {
    // Filter by date range
    if (filters.fecha_desde && entry.fecha_contable < filters.fecha_desde) return false
    if (filters.fecha_hasta && entry.fecha_contable > filters.fecha_hasta) return false
    
    // Filter by state
    if (filters.estado && entry.estado !== filters.estado) return false
    
    // Filter by account
    if (filters.id_cuenta) {
      const hasAccount = entry.detalles.some(
        d => d.id_cuenta === filters.id_cuenta
      )
      if (!hasAccount) return false
    }
    
    // Filter by cost center
    if (filters.id_departamento) {
      const hasDept = entry.detalles.some(
        d => d.id_departamento === filters.id_departamento
      )
      if (!hasDept) return false
    }
    
    // Filter by free text search
    if (filters.busqueda_texto) {
      const text = filters.busqueda_texto.toLocaleLowerCase('es')
      const matches = entry.descripcion.toLocaleLowerCase('es').includes(text) ||
        entry.numero_documento.toLocaleLowerCase('es').includes(text) ||
        entry.tipo_documento.toLocaleLowerCase('es').includes(text)
      if (!matches) return false
    }
    
    return true
  })
}

export function getEntryById(id) {
  const entries = loadCollection('entries').records
  return entries.find(e => e.id === id) || null
}

export function getDistinctDepartments() {
  const entries = loadCollection('entries').records
  const departments = new Set()
  entries.forEach(entry => {
    entry.detalles.forEach(d => {
      if (d.id_departamento) departments.add(d.id_departamento)
    })
  })
  return Array.from(departments)
}

export function getDistinctAccounts() {
  const entries = loadCollection('entries').records
  const accounts = new Set()
  entries.forEach(entry => {
    entry.detalles.forEach(d => accounts.add(d.id_cuenta))
  })
  return Array.from(accounts)
}