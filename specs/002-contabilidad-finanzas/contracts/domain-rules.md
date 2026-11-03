# Contrato de Dominio: Comandos, Estados y Permisos

**Feature**: `002-contabilidad-finanzas` | **Date**: 2026-11-03

## Propósito

Definir el comportamiento observable de los comandos del módulo financiero, independientemente de la interfaz o del almacenamiento. Las vistas y los repositorios deben respetar estas reglas; la interfaz no puede ser la única barrera de validación.

## Adaptador de identidad y organización

El dominio depende de un adaptador inyectable con la siguiente forma conceptual:

```text
IdentityAdapter:
  getSession(): { user: { id, name }, permissions: string[] } | null
  can(permission: string): boolean
  listUsers(): { id, name }[]                 // solo lectura
  listDepartments(): { id, name }[]           // solo lectura
```

Reglas:

- El actor de una acción se toma de `getSession()`, nunca de un campo del formulario.
- Si no hay sesión, toda acción de escritura se deniega.
- Los permisos se comprueban en el comando; ocultar o deshabilitar un botón es solo una ayuda visual.
- Los catálogos de usuarios y departamentos son de solo lectura y no se duplican en el estado financiero.
- La implementación local puede usar datos de demostración, pero debe ser sustituible por el ERP anfitrión.

## Catálogo de permisos

| Permiso | Permite |
|---|---|
| `finance.account.manage` | Crear, editar, activar y desactivar cuentas |
| `finance.entry.create` | Crear y editar asientos en borrador |
| `finance.entry.submit` | Enviar un borrador a revisión |
| `finance.entry.approve` | Aprobar o devolver un asiento pendiente |
| `finance.entry.post` | Contabilizar un asiento aprobado |
| `finance.entry.reverse` | Revertir un asiento contabilizado |
| `finance.report.view` | Consultar el panel, reportes y auditoría |

## Comandos

### `createAccount(input)`

- **Permiso**: `finance.account.manage`.
- **Valida**: código obligatorio y único, nombre obligatorio, tipo y naturaleza válidos, padre existente/activo y sin ciclos.
- **Efecto**: crea una cuenta con `id`, marcas de tiempo y `version = 1`.
- **Errores**: `ACCOUNT_CODE_REQUIRED`, `ACCOUNT_CODE_DUPLICATE`, `ACCOUNT_NAME_REQUIRED`, `ACCOUNT_TYPE_INVALID`, `ACCOUNT_NATURE_INVALID`, `ACCOUNT_PARENT_NOT_FOUND`, `ACCOUNT_PARENT_INACTIVE`, `ACCOUNT_CYCLE`.

### `updateAccount(id, changes)`

- **Permiso**: `finance.account.manage`.
- **Valida**: la cuenta existe; si cambia el código, sigue siendo único; si cambia el padre, no genera ciclo ni apunta a una cuenta inactiva.
- **Efecto**: actualiza los campos permitidos, `updatedAt` y `version`.
- **Errores**: los anteriores más `ACCOUNT_NOT_FOUND` y `ACCOUNT_CONFLICT`.

### `deactivateAccount(id)` / `activateAccount(id)`

- **Permiso**: `finance.account.manage`.
- **Valida**: la cuenta existe. Desactivar una cuenta con descendientes activos se bloquea.
- **Efecto**: cambia `active` y `updatedAt`.
- **Errores**: `ACCOUNT_NOT_FOUND`, `ACCOUNT_HAS_ACTIVE_CHILDREN`.

### `deleteAccount(id)`

- **Permiso**: `finance.account.manage`.
- **Valida**: la cuenta existe, no tiene hijos y no tiene líneas asociadas.
- **Efecto**: elimina la cuenta.
- **Errores**: `ACCOUNT_NOT_FOUND`, `ACCOUNT_HAS_CHILDREN`, `ACCOUNT_HAS_ENTRIES`. En estos casos la interfaz debe ofrecer desactivar.

### `createEntry(input)`

- **Permiso**: `finance.entry.create`.
- **Valida**: fecha contable, tipo y número de documento, descripción, moneda, al menos dos líneas, al menos un cargo y un abono, lados únicos, importes positivos con escala máxima 4, cuentas activas y que aceptan movimientos, departamentos existentes y suma Debe = suma Haber.
- **Efecto**: crea un asiento en `Borrador` con `createdBy`, `createdAt` y `version = 1`; añade un evento `CREAR`.
- **Errores**: `ENTRY_FIELDS_REQUIRED`, `ENTRY_LINES_MIN`, `ENTRY_SIDES_REQUIRED`, `LINE_INVALID_SIDE`, `LINE_AMOUNT_INVALID`, `LINE_AMOUNT_PRECISION`, `ACCOUNT_NOT_POSTABLE`, `DEPARTMENT_NOT_FOUND`, `ENTRY_UNBALANCED`, `ENTRY_CONFLICT`.

### `updateEntry(id, changes)`

- **Permiso**: `finance.entry.create`.
- **Valida**: el asiento existe y está en `Borrador`; se aplican las mismas validaciones que en la creación.
- **Efecto**: actualiza encabezado y líneas, `version` y un evento `EDITAR`.
- **Errores**: `ENTRY_NOT_FOUND`, `ENTRY_IMMUTABLE`, `ENTRY_CONFLICT` y los errores de validación anteriores.

### `submitEntry(id)`

- **Permiso**: `finance.entry.submit`.
- **Valida**: el asiento existe, está en `Borrador` y es válido.
- **Efecto**: estado `Pendiente`, registra `submittedAt`, incrementa `version` y añade evento `ENVIAR`.

### `approveEntry(id)` / `returnEntry(id, reason)`

- **Permiso**: `finance.entry.approve`.
- **Valida**: el asiento existe y está en `Pendiente`. Devolver exige un motivo.
- **Efecto**: aprobar pasa a `Aprobada` y registra `approvedBy` y `approvedAt`; devolver pasa a `Borrador` y registra el motivo. Ambos añaden evento y actualizan `version`.
- **Errores**: `ENTRY_NOT_FOUND`, `ENTRY_TRANSITION_INVALID`, `ENTRY_REASON_REQUIRED`, `PERMISSION_DENIED`, `ENTRY_CONFLICT`.

### `postEntry(id)`

- **Permiso**: `finance.entry.post`.
- **Valida**: el asiento existe, está en `Aprobada`, es válido y todas sus cuentas siguen activas y aceptando movimientos.
- **Efecto**: estado `Contabilizada`, registra `postedBy` y `postedAt`, incrementa `version` y añade evento `CONTABILIZAR`. A partir de este momento el asiento es inmutable.
- **Errores**: `ENTRY_NOT_FOUND`, `ENTRY_TRANSITION_INVALID`, `ACCOUNT_NOT_POSTABLE`, `PERMISSION_DENIED`, `ENTRY_CONFLICT`.

### `reverseEntry(id, reason)`

- **Permiso**: `finance.entry.reverse`.
- **Valida**: el asiento original existe, está en `Contabilizada`, no tiene `reversedByEntryId` y se informa un motivo.
- **Efecto**: crea un asiento nuevo en `Contabilizada` con las líneas espejo (mismo importe, cuenta, departamento y glosa; lado invertido), enlaza `reversalOfEntryId` y `reversedByEntryId`, cambia el original a `Revertida` y añade eventos `REVERTIR` en ambos.
- **Errores**: `ENTRY_NOT_FOUND`, `ENTRY_NOT_POSTED`, `ENTRY_ALREADY_REVERSED`, `ENTRY_REASON_REQUIRED`, `PERMISSION_DENIED`, `ENTRY_CONFLICT`.

### `queryEntries(filters)`

- **Permiso**: `finance.report.view`.
- **Filtros**: rango de fechas inclusivo, cuenta, departamento, estado y texto libre.
- **Efecto**: devuelve los asientos que cumplen todos los criterios, sin mutar el estado.

### `getDashboardMetrics(period)`

- **Permiso**: `finance.report.view`.
- **Efecto**: devuelve ingresos, gastos, resultado neto y flujo de caja calculados a partir de asientos con `postedAt` no nulo del período. No muta el estado.

## Matriz de transiciones

| Desde | Acción | Hacia | Permitido |
|---|---|---|---|
| `Borrador` | Enviar | `Pendiente` | Sí |
| `Pendiente` | Devolver | `Borrador` | Sí |
| `Pendiente` | Aprobar | `Aprobada` | Sí |
| `Aprobada` | Contabilizar | `Contabilizada` | Sí |
| `Contabilizada` | Revertir | `Revertida` | Sí |
| Cualquier otro par | Cualquier acción | — | No |

## Invariantes que todo comando debe preservar

1. Debe = Haber exactamente en todo asiento guardado.
2. Al menos dos líneas y al menos un cargo y un abono.
3. Cada línea tiene un solo lado y un importe positivo de escala máxima 4.
4. Un asiento `Contabilizada` o `Revertida` no se edita ni se elimina.
5. Una sola reversa directa por asiento, con enlaces bidireccionales.
6. Todo cambio de estado genera un evento de auditoría con actor y fecha.
7. Los reportes incluyen asientos `Contabilizada` y `Revertida` para que las reversas neten a cero.
8. Los saldos se derivan de las líneas, no se almacenan.
9. Las cuentas con movimientos o hijos no se eliminan.
10. Los usuarios y departamentos referenciados deben existir.

## Errores y presentación

- Los errores de validación se presentan junto al campo o la línea afectada y conservan los datos introducidos.
- Los errores de permisos se presentan como una denegación clara, sin revelar detalles internos.
- Los conflictos de concurrencia indican que el registro cambió y ofrecen recargar.
- Los errores de persistencia indican que los cambios no se guardaron; nunca se muestra un éxito falso.
- Los estados vacíos explican el siguiente paso y, cuando aplica, ofrecen limpiar filtros o crear el primer registro.

## Limitación de seguridad

En esta versión sin backend, los permisos y la inmutabilidad se aplican en el dominio local. Un usuario con acceso al navegador podría manipular `localStorage`. La autorización y la inmutabilidad definitivas deben aplicarse en el ERP/backend cuando exista. Esta limitación debe documentarse en `README.md` y en la configuración del módulo.
