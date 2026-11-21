import { parseAmount } from '../utils/money.js'
import { amount, date as validateDate } from '../utils/validation.js'

export const ENTRY_STATE = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  CONTABILIZADA: 'Contabilizada',
  REVERTIDA: 'Revertida',
}

export function validateEntryHeader(header) {
  const errors = []

  if (!header.fecha_contable) {
    errors.push('La fecha contable es requerida')
  } else if (!validateDate(header.fecha_contable).valid) {
    errors.push('La fecha contable debe tener formato YYYY-MM-DD')
  }

  if (!header.tipo_documento) {
    errors.push('El tipo de documento es requerido')
  }

  if (!header.numero_documento) {
    errors.push('El número de documento es requerido')
  }

  if (!header.descripcion) {
    errors.push('La descripción es requerida')
  }

  if (!header.moneda) {
    errors.push('La moneda es requerida')
  } else if (!/^[A-Z]{3}$/.test(header.moneda)) {
    errors.push('La moneda debe ser un código ISO 4217 de 3 letras')
  }

  return errors
}

export function validateEntryLines(lines) {
  const errors = []

  for (const line of lines) {
    if (line.monto_debe > 0 && line.monto_haber > 0) {
      errors.push(`Línea ${line.numero_linea}: No se permiten importes en ambos lados (Debe y Haber)`)
    }
  }

  if (lines.length < 2 && errors.length === 0) {
    errors.push('Una transacción debe tener al menos 2 líneas')
  }

  let debeTotal = 0
  let haberTotal = 0
  let linesWithOnlyDebe = 0
  let linesWithOnlyHaber = 0

  for (const line of lines) {
    const amountCheck = amount(line.monto_debe > 0 ? line.monto_debe : line.monto_haber)
    if (!amountCheck.valid) {
      errors.push(`Línea ${line.numero_linea}: ${amountCheck.message}`)
      continue
    }

    if (line.monto_debe > 0 && line.monto_haber === 0) {
      debeTotal += line.monto_debe
      linesWithOnlyDebe++
    } else if (line.monto_haber > 0 && line.monto_debe === 0) {
      haberTotal += line.monto_haber
      linesWithOnlyHaber++
    } else if (line.monto_debe > 0 && line.monto_haber > 0) {
      continue
    } else {
      errors.push(`Línea ${line.numero_linea}: Importe inválido`)
    }
  }

  if (linesWithOnlyDebe > 0 && linesWithOnlyHaber > 0) {
    if (Math.round(debeTotal * 10000) / 10000 !== Math.round(haberTotal * 10000) / 10000) {
      errors.push('El total de Debe debe ser exactamente igual al total de Haber')
    }
  }

  return errors
}

export function createEntryHeader(fechaContable, tipoDocumento, numeroDocumento, descripcion, moneda, idUsuarioCreador) {
  return {
    id: `entry-${Date.now()}`,
    fecha_contable: fechaContable,
    tipo_documento: tipoDocumento,
    numero_documento: numeroDocumento,
    descripcion: descripcion,
    moneda: moneda,
    estado: ENTRY_STATE.BORRADOR,
    id_usuario_creador: idUsuarioCreador,
    id_usuario_aprobador: null,
    id_usuario_contabilizador: null,
    id_transaccion_revertida: null,
    creado_en: new Date().toISOString(),
    aprobado_en: null,
    contabilizado_en: null,
  }
}

export function createEntryLine(idCuenta, idDepartamento, numeroLinea, montoDebe, montoHaber, glosa) {
  const amountCheckDebe = montoDebe > 0 ? parseAmount(montoDebe) : { valid: true }
  const amountCheckHaber = montoHaber > 0 ? parseAmount(montoHaber) : { valid: true }

  if (
    amountCheckDebe.error || amountCheckDebe.amount === null ||
    amountCheckHaber.error || amountCheckHaber.amount === null
  ) {
    throw new Error('Importe fuera del rango permitido (máximo 4 decimales)')
  }

  return {
    id: `det-${Date.now()}-${numeroLinea}`,
    id_transaccion: null,
    id_cuenta: idCuenta,
    id_departamento: idDepartamento || null,
    numero_linea: numeroLinea,
    monto_debe: montoDebe > 0 ? montoDebe : 0,
    monto_haber: montoHaber > 0 ? montoHaber : 0,
    glosa: glosa || '',
  }
}