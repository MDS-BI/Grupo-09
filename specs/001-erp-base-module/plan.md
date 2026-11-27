# Plan de Implementación: Módulo de Contabilidad y Finanzas (ERP)

**Rama**: `001-erp-base-module` | **Fecha**: 2026-11-16 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/001-erp-base-module/spec.md`

## Resumen

Construir el Módulo de Contabilidad y Finanzas sobre la arquitectura web ligera ya existente: Vite con HTML, CSS y JavaScript vanilla (ES2022), persistencia en `localStorage`, sin backend ni framework de interfaz, y un conjunto de módulos de dominio, servicios y vistas. La arquitectura no cambia: se extiende con vistas y servicios para las User Stories 7–12. (El árbol `src/components/*` originalmente planeado para las vistas quedó sin conexión; las vistas reales viven en `src/views/*`, ver "Desviaciones conocidas" más abajo.)

El módulo mantiene la partida doble como regla central y una única fuente de verdad para los saldos: los asientos en estado "Contabilizada". Sobre esa base se añaden:

- **US7 — Centros de costo (FR-030)**: agregación de ingresos, gastos y saldo neto por departamento, con categoría "Sin departamento" y departamentos sin movimientos en $0.00.
- **US8 — Reportes (FR-031–FR-033)**: Estado de Resultados y Flujo de Caja por período, con resultado neto exacto a cuatro decimales y una designación explícita de cuentas de efectivo/bancos (`es_efectivo`).
- **US9 — Integridad del plan de cuentas (FR-034–FR-035)**: bloqueo de borrado de cuentas referenciadas en cualquier estado y protección del árbol frente a ciclos, incluyendo datos heredados.
- **US10 — Bitácora de auditoría (FR-037)**: registro global, cronológico e inmutable de eventos de asientos y cuentas, con vista de solo lectura; el historial por asiento se resuelve como consulta filtrada.
- **US11 — Validación estricta (FR-036)**: validación en tiempo real de líneas, importes positivos, máximo cuatro decimales, sin redondeo automático, y selector limitado a cuentas activas que aceptan movimientos.
- **US12 — Período y respaldo local (FR-038–FR-040)**: período contable activo persistido, versionado de esquema de `localStorage`, migración segura y estado visible de integridad.

La consolidación con US1–US6 se aplica en el diseño: una sola agregación de asientos contabilizados alimenta panel, reportes y centros de costo; una sola marca `es_efectivo` alimenta ambos flujos de caja; una sola bitácora alimenta historial y auditoría; y las reglas de validación viven en `src/utils/` y se reaplican en los servicios.

## Desviaciones conocidas respecto al diseño original (sincronizado 2026-11-26)

Esta sección y el resto del plan fueron actualizados para describir el código tal como está implementado, no solo como fue diseñado. Resumen de las divergencias confirmadas (detalle completo en "Estructura del Proyecto" y "Enfoque de Diseño por Capacidad"):

- El enrutamiento real vive en `src/main.js` (tabla de rutas + hash de navegador), no en `src/components/shell.js`. Todo el árbol `src/components/*` (11 archivos) y `src/module-config.js` están implementados pero **sin ningún import real** fuera de sí mismos — código muerto que precedió a `src/views/*`.
- `metrics-service.js`, `cost-center-service.js` y `report-service.js` existen y están probados, pero ninguna vista real los usa: `dashboard.js`, `centros-costo.js` y `reportes.js` reimplementan cada una su propia agregación de asientos contabilizados.
- El Panel General (`dashboard.js`) usa una heurística de respaldo (`tipo === 'Activo'` y código que empieza en `'1'`) para ingresos de caja además de `es_efectivo`; `reportes.js` usa únicamente `es_efectivo === true`. Esto diverge de FR-033.
- La única protección de ciclos jerárquicos que el usuario experimenta vive en `plan-cuentas.js` (interfaz), no en `domain/account.js` ni en `account-service.js`; estos últimos solo rechazan la autorreferencia directa.
- `account-service.checkAccountIntegrity` bloquea el borrado de cuentas referenciadas por asientos en Borrador/Pendiente/Aprobada, pero **no** por asientos Contabilizados o Revertidos — el caso que FR-034 más necesita proteger.
- Ningún evento de creación/edición/desactivación/reactivación de cuentas llega a la bitácora global (`audit-service`); `plan-cuentas.js` escribe en su lugar a una clave de `localStorage` paralela y de solo escritura que nadie lee.
- `utils/money.js` solo impide el redondeo en el borde de entrada (`parseAmount`); sus operaciones `add`/`subtract`/`multiply`/`divide` usan punto flotante estándar, no una representación entera escalada.
- Existen dos implementaciones independientes de aprobación (`entry-service.approveEntry` sin verificación de permiso propia, `approval-service.approveEntry` con `canApprove`) y de reversa (`entry-service.reverseEntry`, `reverse-service.reverseEntry`); solo una de cada par está conectada a la vista real.
- El módulo implementa su propia pantalla de inicio de sesión (`views/login.js` + `services/auth-service.js`) con una contraseña de demostración única y visible, en lugar de delegar la autenticación al ERP anfitrión como asumía la especificación original.
- `storage.js` valida solo la presencia/igualdad de `schemaVersion`, no la forma ni el tipo de los registros almacenados; la "migración" de versiones antiguas solo reestampa la versión sin transformar datos.
- `domain/shared.js` (`canDeleteUser`/`canDeleteDepartment`) no verifica referencias reales en asientos antes de permitir el borrado de usuarios o departamentos.
- Varias pruebas unitarias/integración contienen aserciones vacías o tautológicas (ver nota en "Re-evaluación de la Constitución").

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS
**Dependencias Principales**: Vite; sin framework de interfaz pesado. Calidad con ESLint 10 y Prettier 3; pruebas con Vitest y jsdom
**Almacenamiento**: `localStorage` del navegador, con envoltura versionada (`schemaVersion`) para cuentas, asientos, eventos y configuración
**Pruebas**: Vitest con jsdom para pruebas unitarias, de integración y de rendimiento sobre datos sembrados
**Plataforma Objetivo**: Navegadores modernos de escritorio y móviles
**Tipo de Proyecto**: Aplicación web de página única
**Objetivos de Rendimiento**:
- Panel financiero: métricas actualizadas en ≤ 2 s tras abrir la vista, con hasta 500 asientos contabilizados (SC-003).
- Centros de costo: totales por departamento en ≤ 2 s para 500 asientos contabilizados (SC-011).
- Estado de Resultados y Flujo de Caja: generación en ≤ 2 s para 500 asientos contabilizados (SC-012).
- Consultas filtradas: ≤ 1 s sobre 500 asientos (SC-006).
- Registro de evento de auditoría: cada acción crítica se escribe en la bitácora en ≤ 1 s (SC-016).
- Bitácora de auditoría: primera página o consulta filtrada en ≤ 1 s para 1,000 eventos como objetivo de UX separado, no como verificación de SC-016.
- Interacción de formulario: validación de línea en ≤ 100 ms por cambio de importe/cuenta (SC-015).

**Restricciones**: Una sola moneda por asiento y sin conversión cambiaria; aritmética decimal exacta de hasta cuatro decimales, nunca punto flotante; sin backend; cost center opcional por línea; RBAC y validaciones aplicadas en servicios, no solo en la interfaz; migración de esquema sin descartar datos silenciosamente; interfaz en español dentro del espacio de trabajo ERP existente.

**Escala/Alcance**: Hasta 500 asientos consultables, hasta 500 cuentas y decenas de departamentos; una instancia contable única; vistas de panel, plan de cuentas, asientos, consulta, centros de costo, reportes, auditoría y configuración.

## Verificación de la Constitución

*COMPROBACIÓN: Debe pasar antes de la investigación de la Fase 0. Reverificar tras el diseño de la Fase 1.*

- **Calidad**: se mantiene la estructura modular existente (`utils`, `domain`, `services`, `components`) con funciones pequeñas y límites claros. Las nuevas capacidades se implementan como extensiones de servicios existentes y componentes nuevos, sin introducir frameworks ni dependencias de interfaz. ESLint y Prettier siguen siendo puertas obligatorias (`npm run lint`, `npm run format:check`).
- **Pruebas**: cada FR-030–FR-040 y SC-011–SC-018 tendrá pruebas unitarias de lógica y de integración de flujo. Las reglas de negocio se prueban primero en servicios (balance, integridad, auditoría, esquema) y luego en la interfaz. Los presupuestos de rendimiento se verifican con pruebas sobre 500 asientos sembrados y medición con `performance.now()`.
- **Experiencia de Usuario**: todas las vistas reutilizan la barra superior, la barra lateral, los tokens de diseño y los patrones existentes de validación, estados vacíos, mensajes de error y toasts. La vista de Auditoría es de solo lectura; Configuración muestra el estado del esquema y los recuentos; toda la interfaz permanece en español.
- **Rendimiento y Confiabilidad**: las agregaciones se calculan en una sola pasada sobre asientos contabilizados, con índices por período/cuenta/departamento cuando el volumen lo requiera y actualizaciones incrementales del DOM. Si un presupuesto no se cumple, se documentará evidencia de perfilado y la alternativa aplicada, según el principio IV.
- **Documentación**: este plan, `quickstart.md` y `data-model.md` reflejan US7–US12 y `es_efectivo` (FR-033). `README.md` se actualiza en la fase de pulido.

## Cobertura de User Stories 7–12

**Nota (estado real)**: la columna "Artefactos" lista ahora los archivos realmente conectados a cada vista. Donde existe un servicio probado pero no conectado, se indica explícitamente.

| Historia | FR | Enfoque de diseño (como implementado) | Artefactos reales | Verificación |
|---|---|---|---|---|
| US7 Centros de costo | FR-030 | `centros-costo.js` reimplementa su propia clasificación Ingreso/Gasto y agregación por `id_departamento` directamente sobre `query-service.filterEntries`; `cost-center-service.computeDepartmentTotals` existe y está probado pero no está conectado | `src/views/centros-costo.js` (real); `src/services/cost-center-service.js` (implementado, no conectado) | SC-011 |
| US8 Estado de Resultados y Flujo de Caja | FR-031, FR-032, FR-033 | `reportes.js` reimplementa su propia agregación y usa `es_efectivo === true` de forma estricta (sin heurística de respaldo, a diferencia del panel); `report-service.buildIncomeStatement`/`buildCashFlow` existen y están probados pero no están conectados | `src/views/reportes.js` (real); `src/services/report-service.js` (implementado, no conectado) | SC-012, SC-013 (divergencia conocida frente al panel, ver "Desviaciones conocidas") |
| US9 Integridad del plan | FR-034, FR-035 | `account-service.checkAccountIntegrity` solo bloquea borrado por referencias en Borrador/Pendiente/Aprobada (no en Contabilizada/Revertida); la detección de ciclos al asignar padre vive únicamente en `plan-cuentas.js` (`creaCicloJerarquico`), no en `domain/account.js` ni en `account-service.js` | `src/views/plan-cuentas.js`, `src/services/account-service.js`, `src/domain/account.js` | SC-014 (parcialmente cumplido, ver "Desviaciones conocidas") |
| US10 Bitácora de auditoría | FR-037 (consolida FR-019) | Colección global append-only real para eventos de asientos (`getPerEntryHistory` confirma el historial por asiento como consulta filtrada); **ningún evento de cuentas llega a esta bitácora** — `plan-cuentas.js` escribe a una clave `localStorage` paralela y de solo escritura que nadie lee | `src/services/audit-service.js`, `src/views/auditoria.js` (solo asientos) | SC-016 (incompleto para eventos de cuentas) |
| US11 Validación estricta | FR-036 (consolida FR-007, FR-011, FR-028) | `nueva-transaccion.js` valida en el formulario (duplicando parte de la lógica de `utils/validation.js`); `entry-service.saveEntry` revalida cuentas/departamentos/balance antes de persistir; `entry-service.addEntry` persiste sin ninguna validación y queda expuesto como API del servicio | `src/utils/money.js`, `src/utils/validation.js`, `src/views/nueva-transaccion.js`, `src/services/entry-service.js` | SC-015 |
| US12 Período y respaldo local | FR-038, FR-039, FR-040 (amplía FR-027) | `settings-service` persiste el período en 3 claves `localStorage` con alias en inglés y español; admite 6 presets, pero `configuracion.js` solo expone 3 (mes/trimestre/personalizado) — `reportes.js`/`centros-costo.js` ofrecen año/año anterior en su propio selector, fuera de Configuración; `storage.js` valida solo versión, no forma de los datos | `src/services/settings-service.js`, `src/storage.js`, `src/views/configuracion.js` | SC-017, SC-018 (parcial, ver "Desviaciones conocidas") |

## Enfoque de Diseño por Capacidad (estado real)

### Fuente única de saldos y reportes

`metrics-service`, `report-service` y `cost-center-service` existen, están probados de forma aislada y exponen exactamente las funciones previstas (`aggregatePostedEntries`/`calculateCashFlow`, `buildIncomeStatement`/`buildCashFlow`, `computeDepartmentTotals`), pero **ninguna vista real los importa**. `src/views/dashboard.js`, `src/views/centros-costo.js` y `src/views/reportes.js` calculan sus propios totales de forma independiente a partir de `query-service.filterEntries()` y `storage.loadCollection('accounts')`. Hoy no existe una única fuente de agregación compartida entre panel, reportes y centros de costo, pese a que las tres vistas aplican reglas muy similares entre sí.

La designación de efectivo/bancos se basa en `Cuenta_Contable.es_efectivo` en `reportes.js`, que exige `es_efectivo === true` de forma estricta para ambos lados del flujo. `dashboard.js` aplica la misma regla estricta para egresos, pero para ingresos de caja además acepta cualquier cuenta con `tipo === 'Activo'` y `codigo` que empiece con `'1'` cuando `es_efectivo` no es estrictamente `true`. Con los datos sembrados esto no genera diferencias visibles (solo una cuenta tiene `es_efectivo: true`), pero es una divergencia de diseño real frente a FR-033 ("no se deduce del nombre ni código") que debe resolverse para sostener SC-013 en catálogos con más cuentas de tipo Activo.

### Integridad del catálogo

`account-service.checkAccountIntegrity(accountId)` es la única función que `plan-cuentas.js` consulta para decidir si ofrecer "Eliminar" o "Desactivar". Su comprobación de referencias está acotada a asientos en estado distinto de `Contabilizada`/`Revertida`: bloquea el borrado si la cuenta está referenciada por un asiento en Borrador, Pendiente o Aprobada, pero **no bloquea el borrado de una cuenta referenciada únicamente por asientos ya Contabilizados o Revertidos** — precisamente el caso que FR-034 más necesita proteger para la trazabilidad histórica. `checkForCycle` recorre con un conjunto de visitados la cadena de padres ya almacenada de la cuenta, pero solo se invoca en el flujo de borrado, nunca al asignar un padre nuevo.

La protección de ciclos que el usuario realmente experimenta al crear o editar una cuenta vive exclusivamente en `plan-cuentas.js` (`creaCicloJerarquico()`), una función de interfaz independiente que no reutilizan ni `domain/account.js` ni `account-service.js`. Además, `plan-cuentas.js` importa `addAccount`/`updateAccount` directamente de `domain/account.js` (no de `account-service.js`), y `domain/account.js` solo rechaza la autorreferencia directa (`id_cuenta_padre === id`) — ni ciclos indirectos ni padres inactivos se bloquean en esa capa. Los wrappers de `account-service.js` que sí invocan la verificación de integridad en alta/edición son, en la práctica, una ruta muerta para la interfaz real.

`domain/shared.js` tampoco bloquea el borrado de usuarios o departamentos referenciados por asientos: `canDeleteUser`/`canDeleteDepartment` solo impiden eliminar el último registro restante del catálogo, sin verificar ninguna referencia real en `Detalle_Transaccion` (FR-021/FR-023 no están aplicadas aquí).

### Auditoría unificada

`audit-service` mantiene una única colección global append-only (`@erp-audit-log`, formato NDJSON) con los campos reales `{ type, entityType, entityId, previousState, newState, timestamp, metadata }`. `getPerEntryHistory(entityId)` confirma que el historial por asiento se resuelve como consulta filtrada de esta misma colección, sin almacén paralelo — ese diseño se cumple para asientos. Sin embargo, **ningún punto del código invoca `logEvent` para la creación, edición, desactivación o reactivación de cuentas**: ni `domain/account.js` ni `account-service.js` importan `audit-service`, y `plan-cuentas.js` escribe en su lugar a una clave de `localStorage` separada y de solo escritura (`accountAuditLogs`, capada a 50 registros) que ninguna vista vuelve a leer. En consecuencia, `auditoria.js` únicamente muestra eventos de asientos; los eventos de cuentas exigidos por FR-037 no existen hoy en la bitácora real.

### Validación estricta de líneas y aritmética monetaria

`utils/money.js` rechaza, sin redondear, cualquier importe con más de cuatro decimales — pero solo en el límite de entrada (`parseAmount`). Las operaciones `add`/`subtract`/`multiply`/`divide` de ese mismo módulo trabajan sobre números de punto flotante estándar de JavaScript una vez parseado el valor, no sobre una representación entera escalada; `multiply` incluso redondea silenciosamente su resultado. La verificación de balance Debe=Haber se repite, también con punto flotante (`Math.round(x * 10000) / 10000`), tanto en `domain/entry.js` como, de forma independiente, en `entry-service.saveEntry`. El requisito de no perder datos de entrada por redondeo se cumple en el formulario, pero la aritmética interna no es de precisión decimal exacta como describe la decisión técnica original ("nunca punto flotante").

`entry-service.js` expone dos funciones de guardado: `saveEntry` (con todas las validaciones: inmutabilidad, balance, cuentas activas, departamentos existentes) y `addEntry`, que persiste sin ninguna validación y queda disponible como API pública del servicio — ningún flujo de la interfaz real la usa para guardar asientos de usuario, pero al no estar acotada a pruebas, representa una vía de bypass si algún código futuro la invoca.

La aprobación y la reversa tienen cada una **dos implementaciones independientes**: `entry-service.approveEntry` (sin verificación de permiso propia) y `approval-service.approveEntry` (con `canApprove`); `entry-service.reverseEntry` y `reverse-service.reverseEntry` (con una asimetría `>= 0` vs `> 0` entre ambas al intercambiar Debe/Haber). `transacciones.js` ejecuta la transición real a través de `entry-service.js`, pero antes consulta `approval-service.canApprove`/`isValidTransition` y `auth-service` para decidir si mostrar y permitir la acción — el control de permiso existe y se ejecuta en código de aplicación antes de invocar el servicio, no solo ocultando el botón, pero no está encapsulado dentro de la función de servicio que efectivamente cambia el estado.

### Autenticación (no contemplada en el diseño original)

El módulo implementa su propia pantalla de inicio de sesión (`views/login.js`) y servicio de sesión (`services/auth-service.js`) sobre el catálogo compartido `Usuario_Base`: cualquier usuario del catálogo puede iniciar sesión seleccionando su perfil, con una contraseña de demostración única y opcional (`DEMO_PASSWORD = 'atlas123'`, mostrada en pantalla como texto de ayuda) en lugar de delegar la autenticación al ERP anfitrión como asumía la especificación original. La sesión se guarda en `localStorage` (`@erp-session`, con una clave heredada `usuarioActivo`) como `{ id, userId, name, role, roleLabel, loginAt }`. Los roles (`ADMIN`, `CONTADOR`, `USER`) controlan un listado estático de módulos accesibles (`ROLE_MODULES`) y alimentan `canApprove`/`canManageEntries`, consumidos tanto para ocultar navegación como dentro de las vistas antes de invocar las acciones de aprobación/contabilización/reversa.

### Período contable y esquema local

`settings-service` persiste el período activo en `localStorage` bajo tres claves (`@erp-settings`, `@erp-active-period`, `@erp-active-period-configured`), con alias duplicados en inglés y español (`from/to/preset` y `desde/hasta/modo`) coexistiendo en el mismo objeto normalizado, y admite seis presets (`month/quarter/custom/year/year-previous/active`). `configuracion.js` solo expone mes/trimestre/personalizado en su interfaz, mientras que `reportes.js` y `centros-costo.js` ofrecen además año y año anterior directamente en su propio selector, sin pasar por la configuración central — el período "por defecto" de Configuración no cubre todos los presets que el usuario puede elegir en Reportes/Centros de Costo. La validación de rango inválido o invertido sí conserva la configuración previa, cumpliendo esa parte de FR-038.

`storage.js` versiona cada colección con un sobre `{ schemaVersion, data }`, pero `ensureSchemaVersion` solo compara la presencia/igualdad de `schemaVersion`; si coincide, los registros se devuelven tal cual, **sin validar su forma ni tipos**. La migración de una versión antigua (`migrateCollection`) solo reestampa `schemaVersion` en cada registro — no transforma ningún campo; la rama prevista para migrar `es_efectivo` en cuentas heredadas está vacía y no hace nada. La vista de Configuración sí muestra la versión activa y los recuentos de cuentas, asientos y eventos, cumpliendo FR-040.

## Presupuesto de Rendimiento

| Vista / operación | Volumen de prueba | Presupuesto | Cómo se verifica |
|---|---|---|---|
| Métricas del panel | 500 asientos contabilizados | ≤ 2 s tras abrir la vista (SC-003) | Prueba de integración con datos sembrados y medición de `performance.now()`; promedio de 5 ejecuciones |
| Totales de Centros de Costo | 500 asientos contabilizados, 50 departamentos | ≤ 2 s (SC-011) | Prueba de rendimiento de `computeDepartmentTotals` y render de la vista |
| Estado de Resultados | 500 asientos contabilizados | ≤ 2 s (SC-012) | Prueba de rendimiento de `buildIncomeStatement` y render |
| Flujo de Caja | 500 asientos contabilizados | ≤ 2 s (SC-012) | Prueba de rendimiento de `buildCashFlow` y render |
| Consulta filtrada | 500 asientos | < 1 s (SC-006) | Prueba de `query-service` con filtros combinados |
| Escritura de evento de auditoría | 1 acción crítica | ≤ 1 s (SC-016) | Prueba de `logEvent` con `performance.now()` por evento crítico |
| Primera página/filtro de bitácora | 1 000 eventos | < 1 s como objetivo de UX, no SC-016 | Prueba de `getEvents` y render de la primera página |
| Validación de línea | Entrada por cambio | ≤ 100 ms (SC-015) | Prueba de interacción con jsdom y medición de la actualización |

**Estrategia**: una sola pasada por período sobre asientos contabilizados; memoización por versión de datos para evitar recomputar panel/reportes al navegar; índices ligeros por `fecha_contable`, `id_cuenta` e `id_departamento`; render incremental con fragmentos de DOM en listas y tablas. Si una medición excede el presupuesto, se documentará el perfilado y la decisión de diseño antes de cerrar la historia.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/001-erp-base-module/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── checklists/
└── tasks.md
```

### Código Fuente (raíz del repositorio) — estado real

```text
index.html                    (marco "Atlas ERP": barra lateral con 9 rutas, contenedor #view-dashboard, contenedor genérico #view-placeholder para el resto, #login-root)
src/
├── main.js                   (punto de entrada real: enrutamiento por hash inline, tabla `views`/`viewAliases`, bootstrap de sesión y seed data — reemplaza al enrutador de shell.js originalmente planeado)
├── styles.css                (tokens de diseño y estilos de todas las vistas)
├── storage.js                (colecciones localStorage con sobre de versión; el log de auditoría usa un stream NDJSON aparte)
├── utils/
│   ├── money.js              (límite de 4 decimales solo en el borde de entrada; add/subtract/multiply/divide usan punto flotante)
│   ├── validation.js         (validadores compartidos: campos requeridos, formato de código, formato ISO 4217, fecha, importe)
│   └── seed.js               (datos de demostración, incluida `seed500Entries()` para pruebas de rendimiento)
├── domain/
│   ├── account.js            (Cuenta_Contable; `addAccount`/`updateAccount`/`deleteAccount` invocados directamente por `plan-cuentas.js`, no vía `account-service.js`)
│   ├── entry.js               (Transaccion + Detalle_Transaccion; valida balance con punto flotante, no con `utils/money.js`)
│   └── shared.js             (Usuario_Base / Departamento_Base; `canDeleteUser`/`canDeleteDepartment` no verifican referencias en asientos)
├── services/
│   ├── metrics-service.js    (agregación base + métricas del panel — implementada y probada, NO consumida por ninguna vista real)
│   ├── cost-center-service.js (implementado y probado, no consumido por `views/centros-costo.js`)
│   ├── report-service.js     (implementado y probado, no consumido por `views/reportes.js`)
│   ├── account-service.js    (`checkAccountIntegrity`/`deleteAccount` sí los usa `plan-cuentas.js` para el borrado; `addAccount`/`updateAccount` de este archivo son ruta muerta)
│   ├── entry-service.js       (ruta real de guardado/aprobación: `saveEntry`, `approveEntry` sin verificación de permiso propia, `addEntry` sin ninguna validación)
│   ├── audit-service.js      (bitácora global real; solo recibe eventos de asientos, no de cuentas)
│   ├── reverse-service.js    (reversa duplicada respecto a `entry-service.reverseEntry`; usada por `transacciones.js`)
│   ├── approval-service.js   (aprobación con `canApprove`, duplicada respecto a `entry-service.approveEntry`; `transacciones.js` la usa solo para la verificación previa)
│   ├── query-service.js      (usada por `consulta.js`, `centros-costo.js`, `reportes.js` y `dashboard.js`)
│   └── settings-service.js   (usada por `configuracion.js`; mezcla claves de período en inglés y español)
└── views/
    ├── dashboard.js           (US1 — agregación propia; incluye exportación a CSV no contemplada en spec.md)
    ├── plan-cuentas.js        (US2/US9 — detección de ciclos propia en `creaCicloJerarquico()`; log de auditoría de cuentas paralelo y muerto en `localStorage['accountAuditLogs']`)
    ├── nueva-transaccion.js   (US3/US11 — alta/edición de borradores; validación de importes duplicada en el formulario)
    ├── transacciones.js       (US4/US5/US6 — listado, aprobación, reversa, historial por asiento; borrado físico solo para Borrador)
    ├── consulta.js            (US6 — filtros combinados, con fallback local si `query-service.filterEntries` falla)
    ├── centros-costo.js       (US7 — clasificación Ingreso/Gasto propia, independiente de `reportes.js`)
    ├── reportes.js            (US8 — única vista con regla estricta `es_efectivo === true` sin heurística de respaldo)
    ├── auditoria.js           (US10 — lectura de la bitácora global; solo eventos de asientos)
    ├── configuracion.js       (US12 — período activo con presets mes/trimestre/personalizado; no ofrece año/año anterior, que sí exponen `reportes.js`/`centros-costo.js`)
    ├── login.js               (pantalla de inicio de sesión real sobre el catálogo compartido de usuarios, con contraseña de demostración visible)
    └── placeholder.js         (exportado pero sin uso; cada vista real inyecta su propio marcado en `#view-placeholder`)
src/services/auth-service.js  (sesión y roles; contraseña única de demostración `DEMO_PASSWORD` sobre el catálogo `Usuario_Base`)

tests/
├── unit/
├── integration/
└── setup/

# Confirmado sin ningún import real fuera de sí mismos — no forman parte de la aplicación servida:
src/components/*.js           (11 archivos: shell.js, dashboard.js, account-form.js, account-list.js, entry-form.js, entry-list.js, entry-actions.js, cost-centers-view.js, reports-view.js, audit-view.js, settings-view.js)
src/module-config.js          (no importado en ningún punto de src/; sus claves de ruta en inglés no coinciden con las claves en español del enrutador real de main.js)
```

**Decisión de Estructura (estado real)**: la aplicación Vite de página única se mantiene, pero el enrutamiento y el montaje de vistas ocurren íntegramente en `main.js` mediante una tabla de rutas y hash de navegador, no en `components/shell.js` como describía el diseño original. Las vistas reales viven en `src/views/*` con nombres en español. `module-config.js` quedó sin consumidores. Cada vista de agregación (`dashboard.js`, `centros-costo.js`, `reportes.js`) implementa su propio cálculo de totales en lugar de reutilizar `metrics-service.js`/`cost-center-service.js`/`report-service.js`, que existen y están probados pero no están conectados a ninguna vista en producción. Ver "Desviaciones conocidas respecto al diseño original" al inicio del plan para el resumen de consecuencias.

## Re-evaluación de la Constitución (estado real, sincronizado 2026-11-26)

- **Calidad**: la estructura real duplica lógica entre `dashboard.js`, `centros-costo.js` y `reportes.js` en lugar de reutilizar una agregación compartida; existen dos implementaciones independientes de aprobación y de reversa; y un árbol completo (`src/components/*`, `src/module-config.js`) quedó sin conexión. Esto contradice el Principio I (mantenibilidad) y debe limpiarse.
- **Pruebas**: varias pruebas unitarias y de integración (`account-integrity`, `reports`, `approval-flow`, `audit-log`, `entry-line-validation`, tanto en `tests/unit/` como en `tests/integration/`) contienen aserciones vacías o tautológicas que no verifican el comportamiento real descrito, lo que viola el Principio II (Test-First). Las pruebas de rendimiento (SC-003, SC-006, SC-011, SC-012, SC-015, SC-016) sí ejecutan mediciones reales con `performance.now()`.
- **Experiencia de Usuario**: estados vacíos, validación por campo y auditoría de solo lectura están implementados tal como se documentó; el idioma español y la coherencia visual se mantienen.
- **Rendimiento**: los presupuestos se miden como estaba previsto, con datos sembrados y `performance.now()`.
- **Documentación**: este plan, `data-model.md`, `spec.md` y `tasks.md` fueron sincronizados con el código real el 2026-11-26; ver "Desviaciones conocidas respecto al diseño original" al inicio de este documento para el detalle completo.

Resultado: existen desviaciones reales respecto al diseño original y violaciones puntuales de los Principios I y II de la constitución, documentadas arriba y en `tasks.md`.

## Seguimiento de Complejidad / Deuda Técnica (estado real)

Esta tabla documenta deuda técnica confirmada al sincronizar la documentación con el código (2026-11-26), no violaciones de alcance del plan original en el momento de redactarlo.

| Elemento | Por qué existe | Alternativa más simple rechazada porque |
|---|---|---|
| Árbol `src/components/*` (11 archivos) y `src/module-config.js` sin conexión | Implementación temprana del diseño original, abandonada en favor de `src/views/*` sin eliminar el código anterior | Mantenerlo no aporta valor; se recomienda eliminarlo (ver tarea de limpieza en `tasks.md`) |
| Agregación duplicada en `dashboard.js`/`centros-costo.js`/`reportes.js` en lugar de `metrics-service`/`cost-center-service`/`report-service` | Las vistas se construyeron de forma independiente antes de conectar los servicios compartidos ya implementados | Conectar las vistas a los servicios existentes es directo; es deuda técnica pendiente, no una decisión de diseño definitiva |
| Dos implementaciones de aprobación (`entry-service.approveEntry`, `approval-service.approveEntry`) y de reversa (`entry-service.reverseEntry`, `reverse-service.reverseEntry`) | Evolución paralela del código sin consolidar en un único punto de verdad | Debe elegirse la implementación realmente invocada por `transacciones.js` como canónica y eliminar la otra |
