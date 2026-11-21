# Plan de Implementación: Módulo de Contabilidad y Finanzas (ERP)

**Rama**: `001-erp-base-module` | **Fecha**: 2026-11-16 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/001-erp-base-module/spec.md`

## Resumen

Construir el Módulo de Contabilidad y Finanzas sobre la arquitectura web ligera ya existente: Vite con HTML, CSS y JavaScript vanilla (ES2022), persistencia en `localStorage`, sin backend ni framework de interfaz, y un conjunto de módulos de dominio, servicios y componentes reutilizables. La arquitectura no cambia: se extiende con vistas y servicios para las User Stories 7–12.

El módulo mantiene la partida doble como regla central y una única fuente de verdad para los saldos: los asientos en estado "Contabilizada". Sobre esa base se añaden:

- **US7 — Centros de costo (FR-030)**: agregación de ingresos, gastos y saldo neto por departamento, con categoría "Sin departamento" y departamentos sin movimientos en $0.00.
- **US8 — Reportes (FR-031–FR-033)**: Estado de Resultados y Flujo de Caja por período, con resultado neto exacto a cuatro decimales y una designación explícita de cuentas de efectivo/bancos (`es_efectivo`).
- **US9 — Integridad del plan de cuentas (FR-034–FR-035)**: bloqueo de borrado de cuentas referenciadas en cualquier estado y protección del árbol frente a ciclos, incluyendo datos heredados.
- **US10 — Bitácora de auditoría (FR-037)**: registro global, cronológico e inmutable de eventos de asientos y cuentas, con vista de solo lectura; el historial por asiento se resuelve como consulta filtrada.
- **US11 — Validación estricta (FR-036)**: validación en tiempo real de líneas, importes positivos, máximo cuatro decimales, sin redondeo automático, y selector limitado a cuentas activas que aceptan movimientos.
- **US12 — Período y respaldo local (FR-038–FR-040)**: período contable activo persistido, versionado de esquema de `localStorage`, migración segura y estado visible de integridad.

La consolidación con US1–US6 se aplica en el diseño: una sola agregación de asientos contabilizados alimenta panel, reportes y centros de costo; una sola marca `es_efectivo` alimenta ambos flujos de caja; una sola bitácora alimenta historial y auditoría; y las reglas de validación viven en `src/utils/` y se reaplican en los servicios.

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

| Historia | FR | Enfoque de diseño | Artefactos | Verificación |
|---|---|---|---|---|
| US7 Centros de costo | FR-030 (consolida FR-010, FR-022, FR-024) | Agregar asientos contabilizados por `id_departamento`; incluir categoría "Sin departamento"; departamentos sin movimientos en $0.00; conciliar con totales del período | `src/services/cost-center-service.js`, `src/components/cost-centers-view.js` | SC-011 |
| US8 Estado de Resultados y Flujo de Caja | FR-031, FR-032, FR-033 | Reutilizar la agregación base del panel; agrupar por cuenta de Ingreso/Egreso; flujo de caja por atributo explícito `es_efectivo`; excluir todo asiento no contabilizado | `src/services/report-service.js`, `src/components/reports-view.js` | SC-012, SC-013 |
| US9 Integridad del plan | FR-034, FR-035 | Verificar referencias en `Detalle_Transaccion` de cualquier estado; detectar ciclos con conjunto de visitados; bloquear borrado y ofrecer desactivación | `src/services/account-service.js`, `src/components/account-form.js`, `src/components/account-list.js` | SC-014 |
| US10 Bitácora de auditoría | FR-037 (consolida FR-019) | Una colección global append-only de eventos; historial por asiento como consulta filtrada; vista sin controles de edición/borrado | `src/services/audit-service.js`, `src/components/audit-view.js` | SC-016 |
| US11 Validación estricta | FR-036 (consolida FR-007, FR-011, FR-028) | Parser monetario estricto y validadores compartidos; mensajes por campo; revalidación en servicio; selector filtrado | `src/utils/money.js`, `src/utils/validation.js`, `src/components/entry-form.js`, `src/services/entry-service.js` | SC-015 |
| US12 Período y respaldo local | FR-038, FR-039, FR-040 (amplía FR-027) | Configuración persistida; envoltura `schemaVersion` con migración segura; panel de estado de almacenamiento; período por defecto en panel y reportes | `src/services/settings-service.js`, `src/storage.js`, `src/components/settings-view.js` | SC-017, SC-018 |

## Enfoque de Diseño por Capacidad

### Fuente única de saldos y reportes

`metrics-service` expone la agregación base de asientos `Contabilizada` (por período, cuenta y departamento). `report-service` y `cost-center-service` reutilizan esa agregación en lugar de recorrer el almacenamiento con reglas propias. Esto evita divergencias entre el panel (FR-001), el Estado de Resultados (FR-031), el Flujo de Caja (FR-032) y los totales por centro de costo (FR-030).

La designación de efectivo/bancos se resuelve con el atributo booleano `es_efectivo` en `Cuenta_Contable` (FR-033). No se infiere por nombre ni código. El mismo atributo, con la designación vigente al momento de calcular, alimenta el panel y el reporte; todo cambio se audita.

### Integridad del catálogo

`account-service` incorpora `checkAccountIntegrity(accountId)` con dos comprobaciones: referencias en cualquier línea de asiento (sin importar el estado) y ciclos directos/indirectos al asignar padre. Devuelve `{ allowed, reason, suggestedAction: 'deactivate' }`. El recorrido del árbol usa un conjunto de visitados para tolerar datos heredados con ciclos sin recursión infinita. La interfaz de cuentas muestra el motivo y reemplaza la eliminación por la desactivación cuando corresponde.

### Auditoría unificada

`audit-service` mantiene una colección global append-only de eventos con `{ id, type, timestamp, userId, entityType, entityId, previousState, newState, metadata }`. Los tipos cubren creación/transición/reversa de asientos y creación/edición/desactivación/reactivación de cuentas. La vista de Auditoría solo lee y filtra; el historial por asiento exigido por FR-019 se obtiene filtrando la misma colección por `entityId`. No se crea un segundo almacén de historial.

### Validación estricta de líneas

`money.js` y `validation.js` incorporan un parser que rechaza nulos, negativos, cero y más de cuatro decimales sin redondear. `entry-form.js` valida en cada cambio y deshabilita el guardado mientras exista una línea inválida; `entry-service.js` repite la validación antes de persistir para impedir bypass de la interfaz. El selector de cuentas se alimenta solo de cuentas activas que aceptan movimientos.

### Período contable y esquema local

`settings-service` persiste `{ activePeriod: { from, to, preset }, schemaVersion }` con validación de rango. `storage.js` envuelve cada colección con versión de esquema, valida forma y tipo al cargar, migra datos sin versión y conserva los registros ante una versión incompatible, informando al usuario. La vista de Configuración muestra la versión activa y los recuentos de cuentas, asientos y eventos.

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

### Código Fuente (raíz del repositorio)

```text
index.html                    (marco ERP: barra superior, barra lateral, contenedores de vista)
src/
├── main.js                   (punto de entrada y wiring)
├── styles.css                (tokens de diseño y estilos de todas las vistas)
├── storage.js                (colecciones localStorage + versión de esquema)
├── module-config.js          (etiquetas, ciclo de vida, permisos, acento)
├── utils/
│   ├── money.js              (aritmética decimal exacta)
│   ├── validation.js         (validadores compartidos y parser estricto)
│   └── seed.js               (datos de demostración y pruebas)
├── domain/
│   ├── account.js            (Cuenta_Contable, incluido es_efectivo)
│   ├── entry.js              (Transaccion + Detalle_Transaccion)
│   └── shared.js             (Usuario_Base / Departamento_Base y permisos)
├── services/
│   ├── metrics-service.js    (agregación base + métricas del panel)
│   ├── cost-center-service.js
│   ├── report-service.js
│   ├── account-service.js
│   ├── entry-service.js
│   ├── audit-service.js
│   ├── reverse-service.js
│   ├── approval-service.js
│   ├── query-service.js
│   └── settings-service.js
└── components/
    ├── shell.js              (marco y enrutamiento de vistas)
    ├── dashboard.js
    ├── account-form.js
    ├── account-list.js
    ├── entry-form.js
    ├── entry-list.js
    ├── entry-actions.js
    ├── cost-centers-view.js
    ├── reports-view.js
    ├── audit-view.js
    └── settings-view.js

tests/
├── unit/
├── integration/
└── setup/
```

**Decisión de Estructura**: se conserva la aplicación Vite de página única con HTML, CSS y JavaScript vanilla, persistencia en `localStorage` y separación entre dominio, servicios y componentes. No se añaden frameworks, enrutadores ni backend. `shell.js` mantiene el marco del espacio de trabajo y el registro de rutas; `main.js` sigue siendo el punto de entrada. Las nuevas vistas se registran en el mismo mecanismo existente y reutilizan los tokens de `styles.css`. La extensión para módulos personalizados sigue centralizada en `module-config.js`.

## Re-evaluación de la Constitución (post-diseño)

- **Calidad**: la estructura propuesta extiende los límites existentes sin duplicar servicios ni introducir dependencias. La agregación compartida evita lógica repetida entre panel, reportes y centros de costo.
- **Pruebas**: cada FR-030–FR-040 tiene tarea de prueba unitaria y de integración asociada en `tasks.md`; los presupuestos SC-003, SC-006, SC-011, SC-012, SC-015 y SC-016 tienen verificación de rendimiento definida, incluida la latencia de escritura de auditoría de SC-016.
- **Experiencia de Usuario**: estados vacíos, validación por campo, mensajes de desactivación y auditoría de solo lectura están especificados en las vistas nuevas. Se mantiene la coherencia visual y el idioma español.
- **Rendimiento**: los presupuestos son medibles y la estrategia de una pasada, memoización e índices es explícita. Cualquier desviación requiere evidencia de perfilado.
- **Documentación**: `plan.md`, `quickstart.md` y `data-model.md` cubren US7–US12, incluido `es_efectivo`; queda actualizar `README.md` en el pulido.

Resultado: sin violaciones de la constitución.

## Seguimiento de Complejidad

Este plan no introduce violaciones de la constitución ni amplía la arquitectura con nuevas plataformas o dependencias.

| Violación | Por qué se necesita | Alternativa más simple rechazada porque |
|---|---|---|
| Ninguna | — | — |
