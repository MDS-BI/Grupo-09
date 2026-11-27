# Inicio Rápido: Módulo de Contabilidad y Finanzas (ERP)

Guía de validación end-to-end para las User Stories 1–12, con énfasis en US7–US12 (FR-030–FR-040 y SC-011–SC-018). La arquitectura se mantiene: Vite + HTML/CSS/JavaScript vanilla, persistencia en `localStorage` y el espacio de trabajo ERP existente.

## Configuración

1. Instale las dependencias con `npm install`.
2. Inicie el servidor de desarrollo con `npm run dev`.
3. Abra la URL local de Vite en un navegador moderno.
4. Para datos de demostración, cargue el conjunto sembrado de `src/utils/seed.js` (cuentas, usuarios, departamentos y asientos contabilizados). Para pruebas de rendimiento, use el escenario de 500 asientos sembrados.

### Comandos de verificación

```text
npm run test:run        # pruebas unitarias e integración
npm run lint            # ESLint
npm run format:check    # Prettier
npm run build           # build de producción
```

## Flujo principal

0. Inicie sesión seleccionando su perfil en la pantalla de inicio (contraseña de demostración opcional y visible en pantalla: `atlas123`). Este inicio de sesión es una implementación propia del módulo, no una integración real con el ERP anfitrión — ver "Limitaciones Conocidas" en `spec.md`.
1. Aterrice en el Panel General y revise las métricas de ingresos, gastos, resultado neto y flujo de caja. El panel también ofrece exportar los datos mostrados a CSV.
2. Cree o revise el plan de cuentas; marque al menos una cuenta como efectivo/banco (`es_efectivo`), otra como Ingreso y otra como Egreso.
3. Registre un asiento balanceado con al menos dos líneas, asignando centro de costo cuando corresponda.
4. Envíe el asiento a revisión, apruébelo y contabilícelo.
5. Consulte Centros de Costo, Reportes y Auditoría.
6. Configure el período contable activo en Configuración.
7. Recargue el navegador y confirme que la configuración y los datos persisten.

## Validación de User Stories 7–12

### US7 — Centros de costo (FR-030, SC-011)

1. Contabilice asientos imputados a distintos departamentos, incluyendo al menos uno sin centro de costo y un departamento del catálogo sin movimientos.
2. Abra **Centros de costo** y seleccione el período.

**Esperado**: cada departamento muestra ingresos, gastos y saldo neto; el departamento sin movimientos aparece en $0.00; las líneas sin centro de costo se agrupan en "Sin departamento"; la suma por departamento concilia con los totales de ingresos y gastos del período.

### US8 — Estado de Resultados y Flujo de Caja (FR-031, FR-032, FR-033, SC-012, SC-013)

1. Mantenga asientos en estado "Borrador" y "Pendiente" dentro del mismo período.
2. Abra **Reportes**, seleccione un rango de fechas y revise las pestañas **Estado de Resultados** y **Flujo de Caja**.

**Esperado**: el Estado de Resultados agrupa saldos de cuentas de Ingreso y Egreso y calcula la utilidad/pérdida neta con cuatro decimales; el Flujo de Caja usa únicamente cuentas con `es_efectivo`; los asientos no contabilizados no aparecen; el flujo de caja coincide con la tarjeta del Panel General (SC-013); ambos reportes se generan en ≤ 2 s con 500 asientos contabilizados.

### US9 — Integridad del plan de cuentas (FR-034–FR-035, SC-014)

1. Intente eliminar una cuenta referenciada por una línea de un asiento en "Borrador" y por otra en "Contabilizada".
2. Intente asignar como padre una cuenta hija de sí misma, un ancestro de la misma rama y la propia cuenta.

**Esperado**: el borrado se bloquea en ambos casos y se ofrece "Desactivar cuenta"; las asignaciones que generan autorreferencia o ciclo se rechazan sin modificar el catálogo; un catálogo heredado con ciclo no provoca recursión infinita ni bloquea la vista.

### US10 — Bitácora de auditoría (FR-037, SC-016)

1. Ejecute el ciclo completo de un asiento: crear, enviar a revisión, aprobar, contabilizar y revertir.
2. Cree, edite, desactive y reactive una cuenta.
3. Abra **Auditoría**.

**Esperado**: cada acción genera un evento cronológico con tipo, fecha/hora, usuario y entidad afectada, y cada evento crítico queda escrito en ≤ 1 s (SC-016); el historial del asiento se obtiene filtrando la misma bitácora; la vista no ofrece controles de edición ni borrado (solo lectura); la primera página o filtro carga en < 1 s como objetivo de UX separado.

### US11 — Validación estricta de líneas e importes (FR-036, SC-015)

1. En el editor de líneas, introduzca `100.12345`, `0`, `-5`, vacío y un valor válido como `100.1200`.
2. Intente seleccionar una cuenta inactiva o que no acepta movimientos.
3. Intente guardar mientras una línea es inválida y verifique que los datos ya introducidos permanecen.

**Esperado**: los importes inválidos se rechazan con un mensaje claro, sin redondeo automático; el guardado se bloquea mientras exista una línea inválida; las cuentas inactivas/no imputables no aparecen en el selector; la validación responde en ≤ 100 ms por cambio; los datos del encabezado y las demás líneas se conservan.

### US12 — Período contable y respaldo local (FR-038, FR-039, FR-040, SC-017, SC-018)

1. Abra **Configuración**, defina un período activo (mes, trimestre o rango personalizado) y guarde.
2. Verifique el panel de estado del almacenamiento: versión de esquema y recuentos de cuentas, asientos y eventos.
3. Recargue la aplicación o cierre y reabra la pestaña.
4. Simule una versión de esquema incompatible en una copia de respaldo y vuelva a cargar.

**Esperado**: el período persiste y el Panel General y Reportes lo usan por defecto; cuentas, asientos y eventos se restauran sin pérdida, duplicación ni degradación de precisión; una versión incompatible conserva los datos y muestra una explicación, sin descartarlos silenciosamente; las configuraciones inválidas o invertidas se rechazan conservando la anterior.

**Nota de estado actual**: Configuración solo ofrece los presets mes/trimestre/rango personalizado. Reportes y Centros de Costo exponen además año y año anterior directamente en su propio selector de período, independientemente de lo guardado en Configuración.

## Validación de las historias base (US1–US6)

- **Panel (US1)**: con asientos contabilizados las métricas coinciden con el período; sin asientos todo muestra cero y una invitación a registrar el primero; al contabilizar un asiento las métricas se actualizan sin recargar.
- **Plan de cuentas (US2)**: código único obligatorio; edición, desactivación y reactivación; código duplicado rechazado; cuenta con movimientos no se elimina.
- **Asientos (US3)**: dos o más líneas; Debe = Haber; se bloquea el desbalance, las líneas con ambos lados, importes inválidos y cuentas inactivas.
- **Auditoría e inmutabilidad (US4)**: un asiento contabilizado no se edita ni elimina; "Revertir" crea el asiento inverso enlazado; solo una reversa directa; el historial muestra usuario y fecha.
- **Aprobación (US5)**: Borrador → Pendiente → Aprobada → Contabilizada sin saltos; se registra aprobador y fecha; usuario sin permiso es denegado.
- **Consulta (US6)**: filtros combinados por fecha, cuenta, centro de costo, estado y texto; estado vacío con "Limpiar filtros"; 500 asientos filtrados en < 1 s.

## Presupuesto de rendimiento

| Escenario | Volumen | Presupuesto | Verificación |
|---|---|---|---|
| Métricas del panel | 500 asientos contabilizados | ≤ 2 s | `tests/integration/dashboard-metrics.test.js` + medición; SC-003 |
| Centros de costo | 500 asientos, 50 departamentos | ≤ 2 s | `tests/integration/cost-centers.test.js` + medición; SC-011 |
| Estado de Resultados | 500 asientos contabilizados | ≤ 2 s | `tests/integration/reports.test.js` + medición; SC-012 |
| Flujo de Caja | 500 asientos contabilizados | ≤ 2 s | `tests/integration/reports.test.js` + medición; SC-012 |
| Consulta filtrada | 500 asientos | < 1 s | `tests/integration/entry-search.test.js`; SC-006 |
| Escritura de evento de auditoría | Una acción crítica | ≤ 1 s | `tests/unit/audit-log.test.js` + `performance.now()` por evento; SC-016 |
| Primera página/filtro de bitácora | 1 000 eventos | < 1 s como objetivo de UX | `tests/integration/audit-log.test.js`; no verifica SC-016 |
| Validación de línea | Un cambio de importe/cuenta | ≤ 100 ms | `tests/integration/entry-line-validation.test.js`; SC-015 |

Registre los tiempos con `performance.now()` sobre datos sembrados y repita cada medición al menos 5 veces. Si un presupuesto no se cumple, documente el perfilado y la decisión de diseño antes de cerrar la historia.

## Criterios de aceptación clave

- **SC-011**: totales por departamento + "Sin departamento" concilian con ingresos/gastos; departamentos sin movimientos en $0.00; vista en ≤ 2 s para 500 asientos contabilizados.
- **SC-012**: reportes en ≤ 2 s para 500 asientos contabilizados, resultado neto exacto a cuatro decimales, 0 asientos no contabilizados incluidos.
- **SC-013**: 0 discrepancias de flujo de caja entre panel y reporte.
- **SC-014**: 100% de borrados de cuentas referenciadas bloqueados; 0 ciclos persistidos.
- **SC-015**: 100% de importes inválidos rechazados sin redondeo; 0 cuentas inactivas seleccionables; validación de cada cambio de línea en ≤ 100 ms.
- **SC-016**: 100% de acciones críticas registradas con usuario y fecha/hora en ≤ 1 s por evento; 0 eventos editables/borrables.
- **SC-017**: período persistido y usado por defecto en panel y reportes; 0 configuraciones inválidas almacenadas.
- **SC-018**: restauración completa sin pérdida ni duplicación; 0 descartes silenciosos ante versión incompatible.

## Extender el Módulo

La personalización sigue centralizada en `src/module-config.js`:

1. Establezca el nombre del módulo, etiquetas y términos en español.
2. Declare campos personalizados para cuentas o asientos.
3. Defina el ciclo de vida de estados y las transiciones permitidas.
4. Ajuste `theme.accentColor` para el acento visual.
5. Añada reglas de validación específicas junto a las reglas compartidas de `src/utils/validation.js`.

La generación de identidad, marcas de tiempo, integridad referencial, persistencia versionada, navegación y búsqueda siguen siendo responsabilidad de la base. Consulte `spec.md`, `data-model.md` y `contracts/` para el detalle completo.
