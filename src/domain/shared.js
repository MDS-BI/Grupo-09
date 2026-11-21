import { loadCollection, addRecord } from '../storage.js'

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
  const target = users.find(u => u.id === userId || u._id === userId)
  if (users.length <= 1 || !target) {
    return { allowed: false, reason: 'No se pueden eliminar usuarios referenciados' }
  }
  return { allowed: true, reason: null }
}

export function canDeleteDepartment(deptId) {
  const departments = loadDepartments()
  const target = departments.find(d => d.id === deptId || d._id === deptId)
  const referenced = departments.some(d => d._id !== target?._id && d.id_departamento === deptId)
  if (departments.length <= 1 || !target || referenced) {
    return { allowed: false, reason: 'No se pueden eliminar departamentos referenciados' }
  }
  return { allowed: true, reason: null }
}

export function getUser(id) {
  const users = loadUsers()
  return users.find(u => u.id === id || u._id === id) || null
}

export function getDepartment(id) {
  const departments = loadDepartments()
  return departments.find(d => d.id === id || d._id === id) || null
}