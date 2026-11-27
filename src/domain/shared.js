import { loadCollection, addRecord } from '../storage.js';

export const USER_BASE_KEY = '@erp-user-base';
const DEPARTMENT_BASE_KEY = '@erp-department-base';

export const USERS = {
  default: [],
};

export const DEPARTMENTS = {
  default: [],
};

export function loadUsers() {
  const result = loadCollection(USER_BASE_KEY);
  USERS.default = result.records;
  return result.records;
}

export function loadDepartments() {
  const result = loadCollection(DEPARTMENT_BASE_KEY);
  DEPARTMENTS.default = result.records;
  return result.records;
}

export function addUser(user) {
  return addRecord(USER_BASE_KEY, user);
}

export function addDepartment(dept) {
  return addRecord(DEPARTMENT_BASE_KEY, dept);
}

function isUserReferenced(userId) {
  const entries = loadCollection('entries').records;
  return entries.some(
    (entry) =>
      entry.id_usuario_creador === userId ||
      entry.id_usuario_aprobador === userId ||
      entry.id_usuario_contabilizador === userId,
  );
}

function isDepartmentReferenced(deptId) {
  const entries = loadCollection('entries').records;
  return entries.some((entry) => (entry.detalles || []).some((line) => line.id_departamento === deptId));
}

export function canDeleteUser(userId) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId || u._id === userId);
  if (!target) {
    return { allowed: false, reason: 'Usuario no encontrado' };
  }
  if (users.length <= 1) {
    return { allowed: false, reason: 'No se puede eliminar el único usuario del catálogo' };
  }
  if (isUserReferenced(userId)) {
    return { allowed: false, reason: 'No se puede eliminar un usuario referenciado por asientos' };
  }
  return { allowed: true, reason: null };
}

export function canDeleteDepartment(deptId) {
  const departments = loadDepartments();
  const target = departments.find((d) => d.id === deptId || d._id === deptId);
  if (!target) {
    return { allowed: false, reason: 'Departamento no encontrado' };
  }
  if (departments.length <= 1) {
    return { allowed: false, reason: 'No se puede eliminar el único departamento del catálogo' };
  }
  if (isDepartmentReferenced(deptId)) {
    return { allowed: false, reason: 'No se puede eliminar un departamento referenciado por asientos' };
  }
  return { allowed: true, reason: null };
}

export function getUser(id) {
  const users = loadUsers();
  return users.find((u) => u.id === id || u._id === id) || null;
}

export function getDepartment(id) {
  const departments = loadDepartments();
  return departments.find((d) => d.id === id || d._id === id) || null;
}
