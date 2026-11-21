import { describe, it, expect } from 'vitest'
import { required, accountCode, currency, date, amount } from '../src/utils/validation.js'

describe('validation.js', () => {
  describe('required', () => {
    it('should return valid for a non-empty string', () => {
      const result = required('some value', 'Campo')
      expect(result.valid).toBe(true)
    })

    it('should return valid for a number', () => {
      const result = required(42, 'Campo')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for empty string', () => {
      const result = required('', 'Campo')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Campo es requerido')
    })

    it('should return invalid for null', () => {
      const result = required(null, 'Campo')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Campo es requerido')
    })

    it('should return invalid for undefined', () => {
      const result = required(undefined, 'Campo')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Campo es requerido')
    })
  })

  describe('accountCode', () => {
    it('should return valid for a numeric code', () => {
      const result = accountCode('1100')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for a non-numeric code', () => {
      const result = accountCode('abc')
      expect(result.valid).toBe(false)
    })

    it('should return invalid for an empty code', () => {
      const result = accountCode('')
      expect(result.valid).toBe(false)
    })
  })

  describe('currency', () => {
    it('should return valid for a 3-letter ISO currency code', () => {
      const result = currency('USD')
      expect(result.valid).toBe(true)
      expect(result.currencyCode).toBe('USD')
    })

    it('should return invalid for a 2-letter code', () => {
      const result = currency('US')
      expect(result.valid).toBe(false)
    })

    it('should return invalid for a 4-letter code', () => {
      const result = currency('USDT')
      expect(result.valid).toBe(false)
    })

    it('should return invalid for null', () => {
      const result = currency(null)
      expect(result.valid).toBe(false)
    })
  })

  describe('date', () => {
    it('should return valid for a date in YYYY-MM-DD format', () => {
      const result = date('2026-10-15')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for a malformed date', () => {
      const result = date('15-10-2026')
      expect(result.valid).toBe(false)
    })

    it('should return invalid for null', () => {
      const result = date(null)
      expect(result.valid).toBe(false)
    })
  })

  describe('amount', () => {
    it('should return valid for a positive number', () => {
      const result = amount(100)
      expect(result.valid).toBe(true)
    })

    it('should return invalid for a negative number', () => {
      const result = amount(-5)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('El importe no puede ser negativo')
    })

    it('should return invalid for zero', () => {
      const result = amount(0)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('El importe no puede ser cero')
    })

    it('should return invalid for a number with more than 4 decimals', () => {
      const result = amount(100.12345)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('El importe no puede tener más de 4 decimales')
    })

    it('should reject an empty string', () => {
      const result = amount('')
      expect(result.valid).toBe(false)
    })
  })
})