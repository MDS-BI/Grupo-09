import { describe, it, expect, beforeEach } from 'vitest';
import { amount } from '../src/utils/validation.js';

describe('validation.js strict amount parsing', () => {
  beforeEach(() => {
    // Clear any stored state
  });

  describe('amount validator', () => {
    it('should reject negative amounts', () => {
      const result = amount(-5);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('El importe no puede ser negativo');
    });

    it('should reject zero', () => {
      const result = amount(0);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('El importe no puede ser cero');
    });

    it('should reject null', () => {
      const result = amount(null);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined', () => {
      const result = amount(undefined);
      expect(result.valid).toBe(false);
    });

    it('should reject empty string implicitly', () => {
      const result = amount('');
      // Empty string: Number('') is 0, which is rejected as zero
      expect(result.valid).toBe(false); // or true depending on implementation
    });

    it('should accept valid amount with 4 decimals', () => {
      const result = amount('100.1200');
      expect(result.valid).toBe(true);
    });

    it('should reject amount with more than 4 decimals', () => {
      const result = amount('100.12345');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('El importe no puede tener más de 4 decimales');
    });

    it('should accept positive integer', () => {
      const result = amount(100);
      expect(result.valid).toBe(true);
    });

    it('should reject non-numeric value', () => {
      const result = amount('abc');
      expect(result.valid).toBe(false);
    });
  });
});
