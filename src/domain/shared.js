import { loadCollection, saveCollection } from '../storage.js'

const USER_BASE_KEY = '@erp-user-base'
const DEPARTMENT_BASE_KEY = '@erp-department-base'

export const USERS = {
  default: [],
}

export const DEPARTMENTS = {
  default: [],
}

export function loadUsers() {
  const result = loadCollection(USER_BASE_KEY)
  USERS.default = result.records
  return result.records
}

export function loadDepartments() {
  const result = loadCollection(DEPARTMENT_BASE_KEY)
  DEPARTMENTS.default = result.records
  return result.records
}

export function addUser(user) {
  return addRecord(USER_BASE_KEY, user)
}

export function addDepartment(dept) {
  return addRecord(DEPARTMENT_BASE_KEY, dept)
}

export function canDeleteUser(userId) {
  const users = loadUsers()
  return users.length === 0 || { allowed: false, reason: 'No se pueden eliminar usuarios referenciados' }
}

export function canDeleteDepartment(deptId) {
  const departments = loadDepartments()
  const referenced = DEPARTMENTS.default.filter(d => d._id !== deptId && d.id_departamento === deptId)
  return referenced.length === 0 || { allowed: false, reason: 'No se pueden eliminar departamentos referenciados' }
}

export function getUser(id) {
  const users = loadUsers()
  return users.find(u => u._id === id) || null
}

export function getDepartment(id) {
  const departments = loadDepartments()
  return departments.find(d => d._id === id) || null
}