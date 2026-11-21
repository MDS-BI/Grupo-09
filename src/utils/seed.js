import { addRecord, loadCollection, saveCollection } from '../storage.js'
import { addUser, addDepartment, loadUsers, loadDepartments } from '../domain/shared.js'

const COMPANY_COLLECTION = 'company'
const BRANCH_COLLECTION = 'branches'
const COST_CENTER_COLLECTION = '@erp-department-base'
const ACCOUNTS_COLLECTION = 'accounts'

export const INITIAL_COMPANY = {
  id: 'company-1',
  nombre: 'Nova Studio',
  identificacion_fiscal: 'J-00000001-0',
  moneda: 'USD',
  pais: 'VE',
}

export const INITIAL_BRANCH = {
  id: 'branch-1',
  id_empresa: 'company-1',
  nombre: 'Sucursal Principal',
  codigo: 'SUC-001',
  direccion: 'Caracas, Venezuela',
  activa: true,
}

export const INITIAL_COST_CENTERS = [
  { id: 'dept-1', nombre: 'Ventas', codigo: 'VEN', acepta_movimientos: true, es_efectivo: false, creado_por: 'user-1' },
  { id: 'dept-2', nombre: 'Compras', codigo: 'COM', acepta_movimientos: true, es_efectivo: false, creado_por: 'user-1' },
  { id: 'dept-3', nombre: 'Recursos Humanos', codigo: 'RH', acepta_movimientos: true, es_efectivo: false, creado_por: 'user-1' },
  { id: 'dept-4', nombre: 'Sin departamento', codigo: 'SIN', acepta_movimientos: false, es_efectivo: false, creado_por: 'user-1' },
]

export const INITIAL_BASE_ACCOUNTS = [
  {
    id: 'account-1',
    codigo: '1100',
    nombre: 'Caja y bancos',
    tipo: 'Activo',
    naturaleza: 'Debe',
    acepta_movimientos: true,
    es_efectivo: true,
    activa: true,
    creado_por: 'user-1',
  },
  {
    id: 'account-2',
    codigo: '4100',
    nombre: 'Ventas',
    tipo: 'Ingreso',
    naturaleza: 'Haber',
    acepta_movimientos: true,
    es_efectivo: false,
    activa: true,
    creado_por: 'user-1',
  },
  {
    id: 'account-3',
    codigo: '5100',
    nombre: 'Compras y servicios',
    tipo: 'Gasto',
    naturaleza: 'Debe',
    acepta_movimientos: true,
    es_efectivo: false,
    activa: true,
    creado_por: 'user-1',
  },
  {
    id: 'account-4',
    codigo: '2100',
    nombre: 'Acreedores',
    tipo: 'Pasivo',
    naturaleza: 'Haber',
    acepta_movimientos: true,
    es_efectivo: false,
    activa: true,
    creado_por: 'user-1',
  },
  {
    id: 'account-5',
    codigo: '3100',
    nombre: 'Capital',
    tipo: 'Patrimonio',
    naturaleza: 'Haber',
    acepta_movimientos: false,
    es_efectivo: false,
    activa: true,
    creado_por: 'user-1',
  },
]

export const SEED = {
  users: [],
  departments: [],
  accounts: INITIAL_BASE_ACCOUNTS,
  entries: [],
}

function hasStorage() {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

function setIfMissing(key, value) {
  if (!hasStorage() || localStorage.getItem(key) !== null) return
  localStorage.setItem(key, JSON.stringify(value))
}

function ensureCollectionRecords(collection, records, matchKey) {
  const existing = loadCollection(collection).records
  const missing = records.filter((record) => !existing.some((item) => item[matchKey] === record[matchKey]))
  if (missing.length > 0) {
    saveCollection(collection, [...existing, ...missing])
  }
  return loadCollection(collection).records
}

export function seedCompany() {
  if (!hasStorage()) return null
  ensureCollectionRecords(COMPANY_COLLECTION, [INITIAL_COMPANY], 'id')
  setIfMissing('empresa', INITIAL_COMPANY)
  setIfMissing('@erp-seed:company', INITIAL_COMPANY)
  return INITIAL_COMPANY
}

export function seedBranch() {
  if (!hasStorage()) return null
  ensureCollectionRecords(BRANCH_COLLECTION, [INITIAL_BRANCH], 'id')
  setIfMissing('sucursal', INITIAL_BRANCH)
  setIfMissing('@erp-seed:branch', INITIAL_BRANCH)
  return INITIAL_BRANCH
}

export function seedCostCenters() {
  if (!hasStorage()) return []
  const centers = ensureCollectionRecords(COST_CENTER_COLLECTION, INITIAL_COST_CENTERS, 'codigo')
  ensureCollectionRecords('centros-costo', INITIAL_COST_CENTERS, 'codigo')
  setIfMissing('centrosCosto', INITIAL_COST_CENTERS)
  return centers
}

export function seedBaseAccounts() {
  if (!hasStorage()) return []
  const accounts = ensureCollectionRecords(ACCOUNTS_COLLECTION, INITIAL_BASE_ACCOUNTS, 'codigo')
  ensureCollectionRecords('cuentas-contables', INITIAL_BASE_ACCOUNTS, 'codigo')
  setIfMissing('cuentasContables', INITIAL_BASE_ACCOUNTS)
  return accounts
}

export function ensureSeedData() {
  return {
    company: seedCompany(),
    branch: seedBranch(),
    costCenters: seedCostCenters(),
    accounts: seedBaseAccounts(),
  }
}

export function seedUsers() {
  SEED.users = [
    { id: 'user-1', name: 'Administrador', role: 'admin', createdAt: new Date().toISOString() },
    { id: 'user-2', name: 'Contador', role: 'user', createdAt: new Date().toISOString() },
  ]
  loadUsers()
  SEED.users.forEach((user) => addUser(user))
  return SEED.users
}

export function seedDepartments() {
  SEED.departments = [
    { id: 'dept-1', nombre: 'Ventas', codigo: 'VEN', acepta_movimientos: true, es_efectivo: false, creado_por: 'user-1' },
    { id: 'dept-2', nombre: 'Compras', codigo: 'COM', acepta_movimientos: true, es_efectivo: false, creado_por: 'user-1' },
    { id: 'dept-3', nombre: 'Recursos Humanos', codigo: 'RH', acepta_movimientos: true, es_efectivo: false, creado_por: 'user-1' },
    { id: 'dept-4', nombre: 'Sin departamento', codigo: 'SIN', acepta_movimientos: false, es_efectivo: false, creado_por: 'user-1' },
  ]
  const existingDepartments = loadDepartments()
  SEED.departments
    .filter((dept) => !existingDepartments.some((item) => item.codigo === dept.codigo))
    .forEach((dept) => addDepartment(dept))
  return SEED.departments
}

export function seedAccounts() {
  SEED.accounts = [
    {
      id: 'account-1',
      codigo: '1100',
      nombre: 'Caja y bancos',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: true,
      activa: true,
      creado_por: 'user-1',
    },
    {
      id: 'account-2',
      codigo: '4100',
      nombre: 'Ventas',
      tipo: 'Ingreso',
      naturaleza: 'Haber',
      acepta_movimientos: true,
      es_efectivo: false,
      activa: true,
      creado_por: 'user-1',
    },
    {
      id: 'account-3',
      codigo: '5100',
      nombre: 'Compras y servicios',
      tipo: 'Gasto',
      naturaleza: 'Haber',
      acepta_movimientos: true,
      es_efectivo: false,
      activa: true,
      creado_por: 'user-1',
    },
    {
      id: 'account-4',
      codigo: '2100',
      nombre: 'Acreedores',
      tipo: 'Pasivo',
      naturaleza: 'Haber',
      acepta_movimientos: true,
      es_efectivo: false,
      activa: true,
      creado_por: 'user-1',
    },
    {
      id: 'account-5',
      codigo: '3100',
      nombre: 'Capital',
      tipo: 'Patrimonio',
      naturaleza: 'Haber',
      acepta_movimientos: false,
      es_efectivo: false,
      activa: true,
      creado_por: 'user-1',
    },
  ]
  const existingAccounts = loadCollection('accounts').records
  SEED.accounts
    .filter((account) => !existingAccounts.some((item) => item.codigo === account.codigo))
    .forEach((account) => addRecord('accounts', account))
  return SEED.accounts
}

export function seedEntries() {
  loadCollection('accounts')
  SEED.entries = [
    {
      id: 'entry-1',
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-001',
      descripcion: 'Venta de servicios',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      id_usuario_aprobador: 'user-1',
      id_usuario_contabilizador: 'user-1',
      detalles: [
        { id: 'det-1', id_cuenta: 'account-1', id_departamento: 'dept-1', numero_linea: 1, monto_debe: 10000, monto_haber: 0, glosa: 'Venta de servicios a cliente' },
        { id: 'det-2', id_cuenta: 'account-2', id_departamento: null, numero_linea: 2, monto_debe: 0, monto_haber: 10000, glosa: 'Ingreso por ventas' },
      ],
    },
    {
      id: 'entry-2',
      fecha_contable: '2026-10-16',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-002',
      descripcion: 'Compra de suministros',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      id_usuario_aprobador: 'user-1',
      id_usuario_contabilizador: 'user-1',
      detalles: [
        { id: 'det-3', id_cuenta: 'account-3', id_departamento: 'dept-2', numero_linea: 1, monto_debe: 5000, monto_haber: 0, glosa: 'Compra de suministros de oficina' },
        { id: 'det-4', id_cuenta: 'account-4', id_departamento: null, numero_linea: 2, monto_debe: 0, monto_haber: 5000, glosa: 'Compra registrada' },
      ],
    },
  ]
  SEED.entries.forEach((entry) => {
    entry.detalles.forEach((det) => {
      const record = {
        ...det,
        _id: `det-${entry.id}-${det.numero_linea}`,
        _timestamp: new Date().toISOString(),
      }
      addRecord('entry-lines', record)
    })
  })
  saveCollection('entries', SEED.entries)
  return SEED.entries
}

export function seed500Entries() {
  let accounts = loadCollection('accounts').records
  let departments = loadDepartments()
  if (accounts.length === 0) accounts = seedAccounts()
  if (departments.length === 0) departments = seedDepartments()
  const now = new Date()
  const entries = []
  for (let i = 0; i < 500; i++) {
    const fecha = new Date(now.getTime() - i * 86400000)
    const day = String(fecha.getDate()).padStart(2, '0')
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const year = fecha.getFullYear()
    const randomAccount = accounts[Math.floor(Math.random() * accounts.length)]
    const randomDept = departments[Math.floor(Math.random() * departments.length)]
    const amount = Math.random() * 10000 + 100
    const debe = Math.round(amount * 10000) / 10000
    const haber = Math.random() > 0.5 ? 0 : Math.round(amount * 10000) / 10000
    const entryState = i % 4 === 0 ? 'Borrador' : i % 4 === 1 ? 'Pendiente' : i % 4 === 2 ? 'Aprobada' : 'Contabilizada'
    const entry = {
      id: `entry-500-${i}`,
      fecha_contable: `${year}-${month}-${day}`,
      tipo_documento: 'FACTURA',
      numero_documento: `F-${String(i + 1).padStart(3, '0')}`,
      descripcion: `Asiento ${i + 1} - servicios financieros`,
      moneda: 'USD',
      estado: entryState,
      id_usuario_creador: 'user-1',
      detalles: [
        {
          id: `det-500-${i}-1`,
          id_cuenta: randomAccount.id,
          id_departamento: randomDept.id,
          numero_linea: 1,
          monto_debe: debe,
          monto_haber: 0,
          glosa: `Línea ${i + 1} - debe`,
        },
        {
          id: `det-500-${i}-2`,
          id_cuenta: accounts.find(a => a.es_efectivo)?.id || 'account-2',
          id_departamento: i % 2 === 0 ? null : randomDept.id,
          numero_linea: 2,
          monto_debe: 0,
          monto_haber: haber,
          glosa: `Línea ${i + 1} - haber`,
        },
      ],
    }
    entries.push(entry)
  }
  SEED.entries = entries
  const nowDate = new Date()
  const lineRecords = entries.flatMap((entry) =>
    entry.detalles.map((det) => ({
      ...det,
      _id: det.id,
      _timestamp: nowDate.toISOString(),
    }))
  )
  saveCollection('entry-lines', lineRecords)
  saveCollection('entries', entries)
  return entries
}