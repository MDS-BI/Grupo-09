import { describe, it, expect, beforeEach } from 'vitest';
import { checkAccountIntegrity, deleteAccount as deleteAccountService } from '../src/services/account-service.js';
import { addAccount, updateAccount } from '../src/domain/account.js';
import { saveEntry } from '../src/services/entry-service.js';
import { loadCollection, saveCollection } from '../storage.js';

function account(overrides = {}) {
  return addAccount({
    codigo: '1100',
    nombre: 'Caja',
    tipo: 'Activo',
    naturaleza: 'Debe',
    acepta_movimientos: true,
    es_efectivo: true,
    activa: true,
    ...overrides,
  }).account;
}

describe('US9: Integridad de cuentas (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should block deletion and suggest "desactivar" for an account referenced by a draft entry', () => {
    const caja = account({ codigo: '1100' });
    const ventas = account({
      codigo: '4100',
      nombre: 'Ventas',
      tipo: 'Ingreso',
      naturaleza: 'Haber',
      es_efectivo: false,
    });
    saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-080',
      descripcion: 'Borrador reference',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: caja.id, monto_debe: 50, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: ventas.id, monto_debe: 0, monto_haber: 50 },
      ],
    });

    const result = deleteAccountService(caja.id);
    expect(result.success).toBe(false);
    expect(result.suggestedAction).toBe('desactivar');
  });

  it('should block deletion of an account referenced by a Contabilizada entry (not only drafts)', () => {
    const caja = account({ codigo: '1101' });
    const ventas = account({
      codigo: '4101',
      nombre: 'Ventas',
      tipo: 'Ingreso',
      naturaleza: 'Haber',
      es_efectivo: false,
    });
    saveEntry({
      fecha_contable: '2026-10-15',
      tipo_documento: 'FACTURA',
      numero_documento: 'F-081',
      descripcion: 'Contabilizada reference',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: caja.id, monto_debe: 100, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: ventas.id, monto_debe: 0, monto_haber: 100 },
      ],
    });

    const result = deleteAccountService(caja.id);
    expect(result.success).toBe(false);
  });

  it('should reject a direct self-parent assignment with a clear message', () => {
    const caja = account({ codigo: '1102' });
    const result = updateAccount(caja.id, { id_cuenta_padre: caja.id });
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('propio padre');
  });

  it('should reject an indirect cycle across three generations without mutating the catalog', () => {
    const grandparent = account({ codigo: '1103', nombre: 'Raíz' });
    const parent = account({ codigo: '1104', nombre: 'Intermedia', id_cuenta_padre: grandparent.id });
    const child = account({ codigo: '1105', nombre: 'Hija', id_cuenta_padre: parent.id });

    const result = updateAccount(grandparent.id, { id_cuenta_padre: child.id });
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('ciclo');

    const stored = loadCollection('accounts').records.find((item) => item.id === grandparent.id);
    expect(stored.id_cuenta_padre).toBeFalsy();
  });

  it('should not recurse infinitely when legacy data already contains a parent cycle', () => {
    const a = account({ codigo: '1106', nombre: 'A' });
    const b = account({ codigo: '1107', nombre: 'B', id_cuenta_padre: a.id });

    // Corrupt stored data directly (bypassing the validator) to simulate a legacy cycle: a -> b -> a.
    const accounts = loadCollection('accounts').records;
    const index = accounts.findIndex((item) => item.id === a.id);
    accounts[index] = { ...accounts[index], id_cuenta_padre: b.id };
    saveCollection('accounts', accounts);

    expect(() => checkAccountIntegrity(a.id)).not.toThrow();
  });

  it('should allow deletion of an account with no references and no cycle', () => {
    const unused = account({ codigo: '1108', nombre: 'Sin uso' });
    const result = deleteAccountService(unused.id);
    expect(result.success).toBe(true);
  });
});
