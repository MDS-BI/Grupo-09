import { describe, expect, it, beforeEach } from 'vitest';
import { loadUsers } from '../../src/domain/shared.js';
import { seedUsers } from '../../src/utils/seed.js';
import {
  LEGACY_SESSION_KEY,
  ROLES,
  SESSION_KEY,
  getCurrentUser,
  hasAccess,
  login,
  logout,
} from '../../src/services/auth-service.js';
import { approverRole, canApprove } from '../../src/services/approval-service.js';

describe('auth-service: sesión y roles', () => {
  beforeEach(() => {
    localStorage.clear();
    seedUsers();
  });

  it('siembra los tres perfiles una sola vez', () => {
    seedUsers();
    const users = loadUsers();
    expect(users.filter((user) => user.id === 'user-1')).toHaveLength(1);
    expect(users.map((user) => user.role)).toEqual(expect.arrayContaining(['admin', 'contador', 'user']));
  });

  it('login guarda la sesión en ambas claves compatibles', () => {
    const result = login('user-1');
    expect(result.success).toBe(true);
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)).role).toBe(ROLES.ADMIN);
    expect(JSON.parse(localStorage.getItem(LEGACY_SESSION_KEY)).id).toBe('user-1');
    expect(getCurrentUser().name).toBe('Camila Méndez');
  });

  it('valida la contraseña de demostración cuando se proporciona', () => {
    expect(login('user-3', 'incorrecta').success).toBe(false);
    expect(login('user-3', 'atlas123').success).toBe(true);
    expect(getCurrentUser().role).toBe(ROLES.USER);
  });

  it('lee la sesión heredada de usuarioActivo', () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify({ id: 'user-2' }));
    expect(getCurrentUser().role).toBe(ROLES.CONTADOR);
  });

  it('logout elimina la sesión activa', () => {
    login('user-1');
    expect(logout().success).toBe(true);
    expect(getCurrentUser()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_SESSION_KEY)).toBeNull();
  });

  it('hasAccess bloquea módulos administrativos al empleado', () => {
    expect(hasAccess('auditoria', ROLES.USER)).toBe(false);
    expect(hasAccess('configuracion', ROLES.USER)).toBe(false);
    expect(hasAccess('reportes', ROLES.USER)).toBe(false);
    expect(hasAccess('accounts', ROLES.USER)).toBe(false);
    expect(hasAccess('cost-centers', ROLES.USER)).toBe(false);
    expect(hasAccess('transacciones', ROLES.USER)).toBe(true);
    expect(hasAccess('nueva-transaccion', ROLES.USER)).toBe(true);
    expect(hasAccess('auditoria', ROLES.ADMIN)).toBe(true);
  });

  it('approval-service resuelve el rol del usuario autenticado', () => {
    login('user-2');
    expect(approverRole()).toBe(ROLES.CONTADOR);
    expect(canApprove(getCurrentUser().role, 'Pendiente')).toBe(true);

    login('user-3');
    expect(approverRole()).toBe(ROLES.USER);
    expect(canApprove(getCurrentUser().role, 'Pendiente')).toBe(false);
  });
});
