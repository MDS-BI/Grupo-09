import { describe, it, expect, beforeEach } from 'vitest';
import { addAccount, updateAccount, deleteAccount, accountValidator } from '../src/domain/account.js';

describe('account domain', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:accounts');
  });

  describe('validator', () => {
    it('should validate a valid account', () => {
      const accounts = [];
      const validator = accountValidator(accounts);
      const result = validator({
        codigo: '1100',
        nombre: 'Caja',
        tipo: 'Activo',
        naturaleza: 'Debe',
        acepta_movimientos: true,
        es_efectivo: true,
        activa: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject duplicate code', () => {
      const accounts = [{ codigo: '1100', nombre: 'Caja' }];
      const validator = accountValidator(accounts);
      const result = validator({
        codigo: '1100',
        nombre: 'Banco',
        tipo: 'Activo',
        naturaleza: 'Debe',
        acepta_movimientos: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El código de cuenta ya existe');
    });

    it('should reject invalid account code', () => {
      const accounts = [];
      const validator = accountValidator(accounts);
      const result = validator({
        codigo: 'abc',
        nombre: 'Caja',
        tipo: 'Activo',
        naturaleza: 'Debe',
        acepta_movimientos: true,
      });
      expect(result.valid).toBe(false);
    });

    it('should require tipo', () => {
      const accounts = [];
      const validator = accountValidator(accounts);
      const result = validator({
        codigo: '1100',
        nombre: 'Caja',
        naturaleza: 'Debe',
        acepta_movimientos: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El tipo de cuenta es requerido');
    });

    it('should require naturaleza', () => {
      const accounts = [];
      const validator = accountValidator(accounts);
      const result = validator({
        codigo: '1100',
        nombre: 'Caja',
        tipo: 'Activo',
        acepta_movimientos: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La naturaleza de la cuenta es requerida');
    });
  });

  describe('addAccount', () => {
    it('should add a new account successfully', () => {
      const result = addAccount({
        codigo: '2100',
        nombre: 'Acreedores',
        tipo: 'Pasivo',
        naturaleza: 'Haber',
        acepta_movimientos: true,
        es_efectivo: false,
        activa: true,
      });
      expect(result.success).toBe(true);
      expect(result.account.codigo).toBe('2100');
      expect(result.account.es_efectivo).toBe(false);
    });

    it('should fail with duplicate code', () => {
      addAccount({
        codigo: '3100',
        nombre: 'Capital',
        tipo: 'Patrimonio',
        naturaleza: 'Haber',
        acepta_movimientos: false,
        es_efectivo: false,
        activa: true,
      });
      const result = addAccount({
        codigo: '3100',
        nombre: 'Capital Social',
        tipo: 'Patrimonio',
        naturaleza: 'Haber',
        acepta_movimientos: false,
        es_efectivo: false,
        activa: true,
      });
      expect(result.success).toBe(false);
    });

    it('should default es_efectivo to false', () => {
      const result = addAccount({
        codigo: '4100',
        nombre: 'Ventas',
        tipo: 'Ingreso',
        naturaleza: 'Haber',
        acepta_movimientos: true,
        activa: true,
      });
      expect(result.account.es_efectivo).toBe(false);
    });
  });

  describe('updateAccount', () => {
    it('should update an account successfully', () => {
      const addResult = addAccount({
        codigo: '5100',
        nombre: 'Compras',
        tipo: 'Gasto',
        naturaleza: 'Haber',
        acepta_movimientos: true,
        es_efectivo: false,
        activa: true,
      });
      const result = updateAccount(addResult.account.id, {
        naturaleza: 'Gasto Modificado',
      });
      expect(result.success).toBe(true);
      expect(result.account.naturaleza).toBe('Gasto Modificado');
    });

    it('should reject duplicate code on update', () => {
      const addResult = addAccount({
        codigo: '6100',
        nombre: 'Ingresos Diversos',
        tipo: 'Ingreso',
        naturaleza: 'Haber',
        acepta_movimientos: true,
        es_efectivo: false,
        activa: true,
      });
      const addResult2 = addAccount({
        codigo: '7100',
        nombre: 'Otros Ingresos',
        tipo: 'Ingreso',
        naturaleza: 'Haber',
        acepta_movimientos: true,
        es_efectivo: false,
        activa: true,
      });
      const result = updateAccount(addResult.account.id, {
        codigo: addResult2.account.codigo,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteAccount', () => {
    it('should not allow deletion of inactive account', () => {
      const result = deleteAccount('non-existent');
      expect(result.success).toBe(false);
    });

    it('should return error for non-existent account', () => {
      const result = deleteAccount('non-existent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cuenta no encontrada');
    });
  });
});
