import { describe, it, expect, beforeEach } from 'vitest';
import { validateEntryHeader, validateEntryLines, createEntryLine } from '../src/domain/entry.js';

describe('entry domain', () => {
  beforeEach(() => {
    localStorage.removeItem('@erp-envelope:entries');
  });

  describe('validateEntryHeader', () => {
    it('should validate a complete header', () => {
      const errors = validateEntryHeader({
        fecha_contable: '2026-10-15',
        tipo_documento: 'FACTURA',
        numero_documento: 'F-001',
        descripcion: 'Venta de servicios',
        moneda: 'USD',
      });
      expect(errors.length).toBe(0);
    });

    it('should reject missing fecha_contable', () => {
      const errors = validateEntryHeader({
        tipo_documento: 'FACTURA',
        numero_documento: 'F-001',
        descripcion: 'Venta',
        moneda: 'USD',
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid date format', () => {
      const errors = validateEntryHeader({
        fecha_contable: '15-10-2026',
        tipo_documento: 'FACTURA',
        numero_documento: 'F-001',
        descripcion: 'Venta',
        moneda: 'USD',
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing tipo_documento', () => {
      const errors = validateEntryHeader({
        fecha_contable: '2026-10-15',
        numero_documento: 'F-001',
        descripcion: 'Venta',
        moneda: 'USD',
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing descripcion', () => {
      const errors = validateEntryHeader({
        fecha_contable: '2026-10-15',
        tipo_documento: 'FACTURA',
        numero_documento: 'F-001',
        moneda: 'USD',
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid moneda', () => {
      const errors = validateEntryHeader({
        fecha_contable: '2026-10-15',
        tipo_documento: 'FACTURA',
        numero_documento: 'F-001',
        descripcion: 'Venta',
        moneda: 'US',
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateEntryLines', () => {
    it('should reject fewer than 2 lines', () => {
      const errors = validateEntryLines([
        { id: '1', id_cuenta: '1', numero_linea: 1, monto_debe: 100, monto_haber: 0, glosa: '' },
      ]);
      expect(errors[0]).toBe('Una transacción debe tener al menos 2 líneas');
    });

    it('should reject unbalanced entry (Debe != Haber)', () => {
      const errors = validateEntryLines([
        { id: '1', id_cuenta: '1', numero_linea: 1, monto_debe: 100, monto_haber: 0, glosa: '' },
        { id: '2', id_cuenta: '2', numero_linea: 2, monto_debe: 0, monto_haber: 50, glosa: '' },
      ]);
      expect(errors[0]).toBe('El total de Debe debe ser exactamente igual al total de Haber');
    });

    it('should accept balanced entry', () => {
      const errors = validateEntryLines([
        { id: '1', id_cuenta: '1', numero_linea: 1, monto_debe: 100, monto_haber: 0, glosa: '' },
        { id: '2', id_cuenta: '2', numero_linea: 2, monto_debe: 0, monto_haber: 100, glosa: '' },
      ]);
      expect(errors.length).toBe(0);
    });

    it('should reject line with both Debe and Haber', () => {
      const errors = validateEntryLines([
        { id: '1', id_cuenta: '1', numero_linea: 1, monto_debe: 100, monto_haber: 50, glosa: '' },
      ]);
      expect(errors[0]).toContain('No se permiten importes en ambos lados');
    });
  });

  describe('createEntryLine', () => {
    it('should create a valid line with debe', () => {
      const line = createEntryLine('account-1', null, 1, 100, 0, 'Glosa de prueba');
      expect(line.monto_debe).toBe(100);
      expect(line.monto_haber).toBe(0);
    });

    it('should create a valid line with haber', () => {
      const line = createEntryLine('account-1', null, 1, 0, 100, 'Glosa de prueba');
      expect(line.monto_debe).toBe(0);
      expect(line.monto_haber).toBe(100);
    });

    it('should throw on invalid amount with >4 decimals', () => {
      expect(() => {
        createEntryLine('account-1', null, 1, 100.12345, 0, '');
      }).toThrow('Importe fuera del rango permitido');
    });
  });
});
