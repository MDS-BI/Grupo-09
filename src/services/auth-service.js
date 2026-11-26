import { getUser, loadUsers } from '../domain/shared.js';

export const SESSION_KEY = '@erp-session';
export const LEGACY_SESSION_KEY = 'usuarioActivo';
export const DEMO_PASSWORD = 'atlas123';

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  CONTADOR: 'contador',
  USER: 'user',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Jefe / Gerente de Finanzas',
  [ROLES.CONTADOR]: 'Contador',
  [ROLES.USER]: 'Empleado',
});

const MODULE_ALIASES = Object.freeze({
  accounts: 'plan-cuentas',
  entries: 'transacciones',
  transactions: 'transacciones',
  query: 'consulta',
  'cost-centers': 'centros-costo',
  reports: 'reportes',
  audit: 'auditoria',
  settings: 'configuracion',
});

const ROLE_MODULES = Object.freeze({
  [ROLES.ADMIN]: '*',
  [ROLES.CONTADOR]: [
    'dashboard',
    'transacciones',
    'nueva-transaccion',
    'consulta',
    'reportes',
    'centros-costo',
    'plan-cuentas',
  ],
  [ROLES.USER]: ['dashboard', 'transacciones', 'nueva-transaccion', 'consulta'],
});

function normalizeRole(value) {
  if (value && typeof value === 'object') return value.role;
  return value;
}

function normalizeModuleKey(moduleKey) {
  const key = String(moduleKey ?? '');
  return MODULE_ALIASES[key] ?? key;
}

function parseStorageValue(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function sessionId(session) {
  if (typeof session === 'string') return session;
  if (!session || typeof session !== 'object') return null;
  return session.id || session.userId || session.user?.id || session.usuario?.id || null;
}

function readSession() {
  try {
    for (const key of [SESSION_KEY, LEGACY_SESSION_KEY]) {
      const value = parseStorageValue(localStorage.getItem(key));
      if (value) return value;
    }
  } catch {
    return null;
  }
  return null;
}

function decorate(user) {
  if (!user) return null;
  const role = user.role || ROLES.USER;
  const name = user.name || user.nombre || user.id;
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('es') ?? '')
    .join('');
  return {
    ...user,
    name,
    role,
    roleLabel: user.roleLabel || ROLE_LABELS[role] || role,
    initials: user.initials || initials || 'AT',
  };
}

function emitAuthChange(user) {
  if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
  document.dispatchEvent(new CustomEvent('auth:changed', { detail: { user } }));
}

export function getUserById(userId) {
  if (!userId) return null;
  const user = getUser(userId);
  if (user) return decorate(user);

  const id = String(userId);
  return decorate(loadUsers().find((item) => item._id === id || item.id === id) || null);
}

export function getCurrentUser() {
  const session = readSession();
  if (!session) return null;
  const id = sessionId(session);
  if (!id) return null;

  const users = loadUsers();
  const user = users.find((item) => item.id === id || item._id === id);
  if (!user) return null;

  const sessionRole = typeof session === 'object' ? session.role : null;
  return decorate(sessionRole && sessionRole === user.role ? { ...user, ...session } : user);
}

export function getAvailableProfiles() {
  return loadUsers()
    .filter((user) => user && Object.values(ROLES).includes(user.role))
    .map(decorate);
}

export function login(userId, password = '') {
  const user = getUserById(userId);
  if (!user) return { success: false, error: 'Perfil no encontrado' };
  if (password && password !== DEMO_PASSWORD) {
    return { success: false, error: `Contraseña de demostración incorrecta (${DEMO_PASSWORD})` };
  }

  const session = {
    id: user.id,
    userId: user.id,
    name: user.name,
    role: user.role,
    roleLabel: user.roleLabel,
    loginAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify(session));
  } catch {
    return { success: false, error: 'No se pudo guardar la sesión' };
  }

  emitAuthChange(user);
  return { success: true, user };
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    return { success: false };
  }

  emitAuthChange(null);
  return { success: true };
}

export function hasAccess(moduleKey, role = getCurrentUser()) {
  const key = normalizeModuleKey(moduleKey);
  if (!key) return false;

  const allowed = ROLE_MODULES[normalizeRole(role)];
  if (!allowed) return false;
  return allowed === '*' || allowed.includes(key);
}

export function canManageEntries(user = getCurrentUser()) {
  return normalizeRole(user) === ROLES.ADMIN;
}
