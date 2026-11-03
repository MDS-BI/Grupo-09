# Contrato de Persistencia: Módulo de Contabilidad y Finanzas

**Feature**: `002-contabilidad-finanzas` | **Date**: 2026-11-03

## Propósito

Definir el contrato entre la capa de dominio y el almacenamiento local del navegador. La implementación de esta versión usa `localStorage`; el contrato está aislado para que pueda sustituirse por un backend sin cambiar las reglas contables.

## Clave y forma de los datos

**Clave raíz**: `erp:finance:state`

**Valor**: cadena JSON con la siguiente forma:

```json
{
  "schemaVersion": 1,
  "stateRevision": 42,
  "savedAt": "2026-11-03T14:30:00.000Z",
  "data": {
    "accounts": [],
    "entries": [],
    "audit": [],
    "settings": {
      "defaultCurrency": "USD",
      "activePeriod": "2026-10"
    }
  }
}
```

### Cuenta persistida

```json
{
  "id": "acc_01",
  "code": "1.1.1",
  "name": "Caja",
  "type": "ACTIVO",
  "nature": "DEBIT",
  "parentId": null,
  "acceptsEntries": true,
  "isCashEquivalent": true,
  "active": true,
  "createdAt": "2026-11-03T14:00:00.000Z",
  "updatedAt": "2026-11-03T14:00:00.000Z",
  "version": 1
}
```

### Asiento persistido

```json
{
  "id": "ent_01",
  "accountingDate": "2026-10-19",
  "documentType": "Comprobante",
  "documentNumber": "TRX-2026-1048",
  "description": "Pago de servicios profesionales",
  "currency": "USD",
  "status": "Contabilizada",
  "createdBy": "usr_01",
  "approvedBy": "usr_02",
  "postedBy": "usr_02",
  "createdAt": "2026-11-03T14:00:00.000Z",
  "submittedAt": "2026-11-03T14:05:00.000Z",
  "approvedAt": "2026-11-03T14:10:00.000Z",
  "postedAt": "2026-11-03T14:15:00.000Z",
  "reversalOfEntryId": null,
  "reversedByEntryId": null,
  "version": 3,
  "lines": [
    {
      "id": "lin_01",
      "lineNumber": 1,
      "accountId": "acc_02",
      "departmentId": "dep_01",
      "side": "DEBIT",
      "amountUnits": 24500000,
      "memo": "Servicios profesionales"
    },
    {
      "id": "lin_02",
      "lineNumber": 2,
      "accountId": "acc_01",
      "departmentId": "dep_01",
      "side": "CREDIT",
      "amountUnits": 24500000,
      "memo": "Pago de servicios profesionales"
    }
  ]
}
```

### Evento de auditoría persistido

```json
{
  "id": "aud_01",
  "entryId": "ent_01",
  "action": "CONTABILIZAR",
  "previousStatus": "Aprobada",
  "newStatus": "Contabilizada",
  "actorId": "usr_02",
  "occurredAt": "2026-11-03T14:15:00.000Z",
  "reason": null,
  "revision": 3
}
```

## Operaciones

Todas las operaciones son síncronas en esta versión y deben fallar de forma explícita; nunca deben simular éxito si la escritura no se completó.

- `loadState()`: lee, valida y migra el estado. Devuelve un estado vacío válido si no existe la clave. Si el JSON está corrupto, aísla el valor original y devuelve un estado vacío con una advertencia.
- `saveState(state)`: valida la forma completa, incrementa `stateRevision`, actualiza `savedAt` y escribe una sola vez. Lanza un error si la escritura falla.
- `resetState()`: elimina únicamente la clave `erp:finance:state`; no toca otras claves de la aplicación.
- `exportState()`: devuelve una copia serializable del estado actual.
- `importState(json)`: valida y migra un estado externo antes de reemplazar el actual; rechaza versiones futuras o formas inválidas.

## Validación de forma

Al cargar se deben comprobar, como mínimo:

- `schemaVersion` es un entero conocido.
- `data.accounts`, `data.entries` y `data.audit` son arreglos.
- Cada cuenta tiene `id`, `code`, `name`, `type`, `nature`, `active` y `version` con tipos válidos.
- Cada asiento tiene `id`, `accountingDate`, `description`, `currency`, `status`, `createdBy` y `lines` con tipos válidos.
- Cada línea tiene `id`, `lineNumber`, `accountId`, `side` y `amountUnits` con tipos válidos.
- No existen identificadores duplicados dentro de una misma colección.
- Las referencias de línea a cuenta existen en el estado cargado.
- Los importes son enteros positivos y seguros (`Number.isSafeInteger`).

Si una validación falla, no se debe sobrescribir el estado original; se informa el problema y se ofrece exportar o reiniciar.

## Migraciones

- Las migraciones se ejecutan al cargar, antes de renderizar cualquier vista.
- Cada migración es idempotente y transforma la forma completa al esquema actual.
- Ejecutar la migración dos veces debe producir el mismo estado.
- Se conserva una copia del valor original bajo `erp:finance:state:backup` antes de migrar.
- Si `schemaVersion` es mayor que la soportada, el módulo entra en modo de solo lectura y no sobrescribe los datos.

## Concurrencia y errores

- `stateRevision` se incrementa en cada escritura. Un comando que leyó una revisión anterior debe rechazarse con un error de conflicto si la revisión cambió.
- Se escucha el evento `storage` para refrescar el estado en otras pestañas.
- `QuotaExceededError`, errores de seguridad y modo privado se informan al usuario; no se descartan silenciosamente.
- Los errores de validación del dominio se propagan sin escribir en el almacenamiento.
- No se almacenan credenciales, tokens ni secretos en `localStorage`.

## Expectativas de integridad

- Una sola escritura por comando evita estados parciales entre cuentas, asientos y auditoría.
- Las líneas se guardan anidadas dentro de su asiento.
- Los eventos de auditoría son de solo adición.
- Los asientos contabilizados o revertidos no se modifican ni se eliminan; solo cambian mediante los comandos permitidos.
- Las referencias a usuarios y departamentos no se persisten como catálogos; se validan contra el adaptador compartido.
