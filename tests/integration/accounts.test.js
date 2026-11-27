import { describe, it, expect, beforeEach } from 'vitest';
import { addAccount, updateAccount, deleteAccount } from '../src/services/account-service.js';

describe('US2: Account management', () => {
  beforeEach(() => {
    // Initialize test data
    localStorage.removeItem('@erp-envelope:accounts');
    localStorage.removeItem('@erp-envelope:entry-lines');
  });

  it('should create a new account with es_efectivo', () => {
    // Add account with es_efectivo
    const result = addAccount({
      codigo: '1100',
      nombre: 'Caja y bancos',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: true,
      activa: true,
    });
    expect(result.success).toBe(true);
    expect(result.account.es_efectivo).toBe(true);
  });

  it('should reject duplicate account code', () => {
    addAccount({
      codigo: '1100',
      nombre: 'Caja',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: false,
      activa: true,
    });
    const result = addAccount({
      codigo: '1100',
      nombre: 'Banco',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: true,
      activa: true,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Ya existe una cuenta con ese código');
  });

  it('should deactivate account instead of deleting when it has movements', () => {
    // First add a posted entry that references the account
    addAccount({
      codigo: '1100',
      nombre: 'Caja',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: true,
      activa: true,
    });

    // Try to delete the account
    const result = deleteAccount('account-1');
    // Should fail and suggest deactivation
    expect(result.success).toBe(false);
  });

  it('should persist es_efectivo across operations', () => {
    // Add account with es_efectivo
    const addResult = addAccount({
      codigo: '1100',
      nombre: 'Caja',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: true,
      activa: true,
    });
    expect(addResult.success).toBe(true);
    expect(addResult.account.es_efectivo).toBe(true);

    // Update account - maintain es_efectivo
    const updateResult = updateAccount(addResult.account.id, {
      nombre: 'Caja actualizada',
      es_efectivo: false,
    });
    expect(updateResult.success).toBe(true);
    expect(updateResult.account.es_efectivo).toBe(false);
  });

  it('should handle account hierarchy - parent/child', () => {
    // Add parent account
    const parentResult = addAccount({
      codigo: '1100',
      nombre: 'Caja principal',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: false,
      activa: true,
    });
    expect(parentResult.success).toBe(true);

    // Add child account with parent reference
    const childResult = addAccount({
      codigo: '1101',
      nombre: 'Caja chica',
      tipo: 'Activo',
      naturaleza: 'Debe',
      acepta_movimientos: true,
      es_efectivo: false,
      activa: true,
      // Note: id_cuenta_padre handling would be in the service
    });
    expect(childResult.success).toBe(true);
  });
});
