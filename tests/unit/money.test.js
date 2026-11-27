import { describe, it, expect } from 'vitest';
import { parseAmount, formatAmount, add, subtract, multiply, divide } from '../src/utils/money.js';

describe('money.js', () => {
  describe('parseAmount', () => {
    it('should parse a valid integer', () => {
      const result = parseAmount(100);
      expect(result.amount).toBe(100);
      expect(result.error).toBeUndefined();
    });

    it('should parse a valid decimal with 4 places', () => {
      const result = parseAmount('100.1234');
      expect(result.amount).toBe(100.1234);
      expect(result.error).toBeUndefined();
    });

    it('should parse a valid decimal with fewer than 4 places', () => {
      const result = parseAmount('50.5');
      expect(result.amount).toBe(50.5);
      expect(result.error).toBeUndefined();
    });

    it('should reject null', () => {
      const result = parseAmount(null);
      expect(result.amount).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should reject undefined', () => {
      const result = parseAmount(undefined);
      expect(result.amount).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should reject empty string', () => {
      const result = parseAmount('');
      expect(result.amount).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should reject amounts with more than 4 decimals', () => {
      const result = parseAmount('100.12345');
      expect(result.amount).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('formatAmount', () => {
    it('should format a positive amount', () => {
      const result = formatAmount(100.1234);
      expect(result).toBe('100.1234');
    });

    it('should format a negative amount', () => {
      const result = formatAmount(-50.5);
      expect(result).toBe('-50.5000');
    });

    it('should format zero with 4 decimals', () => {
      const result = formatAmount(0);
      expect(result).toBe('0.0000');
    });
  });

  describe('add', () => {
    it('should add two valid amounts', () => {
      const result = add(100, 50);
      expect(result.result).toBe(150);
    });

    it('should handle error from parseAmount', () => {
      const result = add('invalid', 50);
      expect(result.result).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('subtract', () => {
    it('should subtract two valid amounts', () => {
      const result = subtract(100, 50);
      expect(result.result).toBe(50);
    });
  });

  describe('multiply', () => {
    it('should multiply two valid amounts', () => {
      const result = multiply(50, 2);
      expect(result.result).toBe(100);
    });
  });

  describe('divide', () => {
    it('should divide two valid amounts', () => {
      const result = divide(100, 2);
      expect(result.result).toBe(50);
    });

    it('should handle division by zero', () => {
      const result = divide(100, 0);
      expect(result.result).toBeNull();
      expect(result.error).toBe('DIVISION_BY_ZERO');
    });
  });
});
