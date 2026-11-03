# Quickstart: Módulo de Contabilidad y Finanzas

**Feature**: `002-contabilidad-finanzas` | **Date**: 2026-11-03

## Requisitos previos

- Node.js 20 o superior (el entorno actual usa Node 24).
- npm 10 o superior.
- Navegador moderno con soporte de módulos ES, `localStorage` e `Intl`.

## Configuración y ejecución

```powershell
npm install
npm run dev
```

Abra la URL que imprime Vite (por defecto `http://localhost:5173`).

## Pruebas

```powershell
# Ejecución única (recomendada para CI)
npx vitest run

# Modo watch durante el desarrollo
npm test

# Un archivo específico
npx vitest run tests/unit/entries.test.js
```

> Nota: la suite actual del módulo base anterior será reemplazada por las pruebas financieras descritas en [plan.md](plan.md). Mientras convivan ambas, las pruebas obsoletas pueden fallar por módulos inexistentes; la referencia de aceptación es la suite financiera.

## Build de producción

```powershell
npm run build
npm run preview
```

El build debe completar sin errores y la vista previa debe servirse en `http://localhost:4173`.

## Escenarios de validación de extremo a extremo

Los detalles de campos y reglas están en [data-model.md](data-model.md). Los contratos de persistencia y comandos están en [contracts/finance-storage.md](contracts/finance-storage.md) y [contracts/domain-rules.md](contracts/domain-rules.md).

### 1. Estado vacío del panel

1. Abra la aplicación con el almacenamiento local limpio.
2. Verifique el panel general.

**Resultado esperado**: las métricas de ingresos, gastos, resultado neto y flujo de caja muestran cero; aparece un estado vacío que invita a registrar el primer asiento. No hay errores en la consola.

### 2. Creación de una cuenta contable

1. Vaya a **Plan de cuentas** y cree una cuenta con código `1.1.1`, nombre `Caja`, tipo `ACTIVO`, naturaleza `DEBE`, que acepta movimientos y es equivalente de efectivo.
2. Cree una segunda cuenta `4.1.1`, nombre `Ingresos por servicios`, tipo `INGRESO`, naturaleza `HABER`, que acepta movimientos.
3. Intente crear otra cuenta con el código `1.1.1`.

**Resultado esperado**: las dos primeras cuentas aparecen en el catálogo; la tercera se rechaza con un error de código duplicado y no altera el catálogo. Al recargar la página, las cuentas persisten.

### 3. Asiento balanceado

1. Vaya a **Transacciones** y cree un asiento con fecha contable, tipo `Comprobante`, número `TRX-001`, descripción `Venta de servicios`, moneda `USD`.
2. Añada una línea al Debe por `1.000,00` en la cuenta `1.1.1` y una línea al Haber por `1.000,00` en la cuenta `4.1.1`.
3. Guarde el asiento.

**Resultado esperado**: el asiento se guarda en estado `Borrador` y aparece en la lista.

### 4. Rechazo de asiento desbalanceado

1. Cree un asiento con una línea al Debe por `1.000,00` y una línea al Haber por `900,00`.
2. Intente guardarlo.

**Resultado esperado**: se bloquea el guardado con un mensaje que indica que el Debe y el Haber no coinciden; no se persiste ninguna parte del asiento.

### 5. Rechazo de líneas inválidas

1. Intente guardar un asiento con una sola línea.
2. Intente introducir un importe en Debe y Haber en la misma línea.
3. Intente introducir un importe con cinco decimales, cero o negativo.
4. Intente usar una cuenta inactiva.

**Resultado esperado**: cada caso se rechaza con un mensaje claro y los datos ya introducidos se conservan para su corrección.

### 6. Flujo de aprobación

1. Cree un asiento balanceado en `Borrador`.
2. Envíelo a revisión.
3. Con un usuario autorizado, apruébelo.
4. Contabilícelo.

**Resultado esperado**: el estado avanza `Borrador → Pendiente → Aprobada → Contabilizada`; se registran el remitente, el aprobador, el contabilizador y las fechas. Un usuario sin permiso no puede aprobar ni contabilizar.

### 7. Inmutabilidad y reversa

1. Abra un asiento `Contabilizada` e intente editar sus líneas o importes.
2. Ejecute la acción **Revertir** indicando un motivo.
3. Abra el asiento original y el asiento de reversa.

**Resultado esperado**: la edición se bloquea; la reversa crea un asiento nuevo con los lados invertidos y enlaces bidireccionales; el original pasa a `Revertida`. Un segundo intento de reversa se rechaza. El panel y los reportes reflejan el efecto neto cero del par.

### 8. Filtros y búsqueda

1. Cree asientos en fechas, cuentas, departamentos y estados distintos.
2. Filtre por rango de fechas, cuenta, departamento y estado.
3. Busque por texto libre.
4. Aplique un filtro sin coincidencias y limpie los filtros.

**Resultado esperado**: solo aparecen los asientos que cumplen todos los criterios; el estado vacío es claro y la opción de limpiar restaura la lista completa.

### 9. Persistencia y recarga

1. Cree cuentas y asientos.
2. Cierre y vuelva a abrir el navegador o recargue la página.

**Resultado esperado**: cuentas, asientos, estados y auditoría se conservan; no hay duplicados ni pérdida de datos.

### 10. Panel con datos reales

1. Contabilice al menos un asiento de ingreso y uno de gasto.
2. Vuelva al panel general y cambie el período.

**Resultado esperado**: las métricas reflejan los asientos contabilizados del período; los cambios se actualizan sin recargar manualmente. Un asiento revertido no distorsiona los totales.

## Criterios de aceptación rápida

- [ ] La aplicación arranca sin errores de consola.
- [ ] El panel muestra ceros con el almacenamiento vacío.
- [ ] Se puede crear, editar y desactivar una cuenta.
- [ ] Se rechazan códigos duplicados y ciclos de jerarquía.
- [ ] Se rechazan asientos desbalanceados, con menos de dos líneas o con líneas inválidas.
- [ ] El flujo de aprobación respeta permisos y transiciones.
- [ ] Los asientos contabilizados son inmutables y solo se corrigen con reversa.
- [ ] Los filtros y la búsqueda devuelven resultados correctos.
- [ ] Los datos persisten tras recargar.
- [ ] `npx vitest run` pasa la suite financiera.
- [ ] `npm run build` completa sin errores.
