import { describe, it, expect, beforeEach } from 'vitest';
import { checkAccountIntegrity } from '../src/services/account-service.js';
import { addAccount, updateAccount } from '../src/domain/account.js';
import { saveEntry } from '../src/services/entry-service.js';

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

describe('US9: Integridad de cuentas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should block deletion of an account referenced by a draft entry', () => {
    const caja = account();
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
      numero_documento: 'F-070',
      descripcion: 'Borrador reference',
      moneda: 'USD',
      estado: 'Borrador',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: caja.id, monto_debe: 50, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: ventas.id, monto_debe: 0, monto_haber: 50 },
      ],
    });

    const result = checkAccountIntegrity(caja.id);
    expect(result.allowed).toBe(false);
    expect(result.suggestedAction).toBe('desactivar');
  });

  it('should block deletion of an account referenced by a Contabilizada entry', () => {
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
      numero_documento: 'F-071',
      descripcion: 'Contabilizada reference',
      moneda: 'USD',
      estado: 'Contabilizada',
      id_usuario_creador: 'user-1',
      detalles: [
        { numero_linea: 1, id_cuenta: caja.id, monto_debe: 100, monto_haber: 0 },
        { numero_linea: 2, id_cuenta: ventas.id, monto_debe: 0, monto_haber: 100 },
      ],
    });

    const result = checkAccountIntegrity(caja.id);
    expect(result.allowed).toBe(false);
  });

  it('should allow deletion of an account with no references and no cycle', () => {
    const unused = account({ codigo: '1200', nombre: 'Banco' });
    const result = checkAccountIntegrity(unused.id);
    expect(result.allowed).toBe(true);
  });

  it('should reject a direct self-parent assignment', () => {
    const caja = account({ codigo: '1300' });
    const result = updateAccount(caja.id, { id_cuenta_padre: caja.id });
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('propio padre');
  });

  it('should reject an indirect hierarchy cycle on update', () => {
    const grandparent = account({ codigo: '1400', nombre: 'Raíz' });
    const parent = account({ codigo: '1401', nombre: 'Intermedia', id_cuenta_padre: grandparent.id });
    const child = account({ codigo: '1402', nombre: 'Hija', id_cuenta_padre: parent.id });

    // grandparent -> child would close the loop grandparent -> child -> parent -> grandparent
    const result = updateAccount(grandparent.id, { id_cuenta_padre: child.id });
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('ciclo');
  });

  it('should reject assigning an inactive account as parent', () => {
    const inactiveParent = account({ codigo: '1500', nombre: 'Inactiva', activa: false });
    const child = account({ codigo: '1501', nombre: 'Hija' });
    const result = updateAccount(child.id, { id_cuenta_padre: inactiveParent.id });
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('inactiva');
  });
});
