# Implementation Plan: Módulo de Contabilidad y Finanzas

**Branch**: `002-contabilidad-finanzas` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-contabilidad-finanzas/spec.md`

## Summary

Construir el Módulo de Contabilidad y Finanzas sobre el espacio de trabajo ERP existente (Vite + HTML, CSS y JavaScript vanilla) sin sustituir la barra lateral, la barra superior ni los tokens de diseño actuales. El módulo incorpora un plan de cuentas jerárquico, asientos con partida doble estricta, un flujo de estados con aprobación, inmutabilidad de asientos contabilizados y reversas enlazadas, auditoría, centros de costo, consultas filtradas y un panel con métricas derivadas de los asientos contabilizados. La persistencia será local al navegador con un esquema versionado y migraciones idempotentes; no se requiere backend en esta versión. Los importes se representarán como enteros con escala fija de cuatro decimales para evitar errores de redondeo. La identidad y los departamentos se obtendrán mediante un adaptador reemplazable que referencia los catálogos del ERP anfitrión.

## Technical Context

**Language/Version**: JavaScript (ES2022, módulos ESM), HTML5, CSS3

**Primary Dependencies**: Vite 8 (desarrollo y build), Vitest 4 (pruebas), jsdom 30 (pruebas de integración). Sin dependencias de ejecución ni framework de interfaz.

**Storage**: `localStorage` del navegador bajo la clave raíz `erp:finance:state`, con `schemaVersion`, revisión de estado y migraciones idempotentes. No hay backend ni base de datos central en esta versión.

**Testing**: Vitest con pruebas unitarias para el dominio puro y pruebas de integración con jsdom para vistas, formularios, persistencia y flujos de aprobación/reversa.

**Target Platform**: Navegadores modernos de escritorio y móviles con soporte de módulos ES, `localStorage` e `Intl`.

**Project Type**: Aplicación web de una sola página (SPA ligera) integrada en el shell ERP existente.

**Performance Goals**: Filtrado y consulta de hasta 500 asientos en menos de 1 segundo; render del panel con métricas en menos de 2 segundos; interacciones de formulario percibidas como instantáneas (menos de 100 ms de trabajo de interfaz por acción).

**Constraints**: JavaScript vanilla sin framework; sin backend; interfaz en español; precisión monetaria exacta de cuatro decimales; una sola moneda por asiento; preservar la estructura visual central del ERP; los datos deben sobrevivir al cierre y reapertura del navegador; los permisos de interfaz no sustituyen la autorización real del ERP anfitrión.

**Scale/Scope**: Una empresa/instancia contable, hasta 500 asientos consultables, siete vistas de navegación (Panel general, Transacciones, Plan de cuentas, Centros de costo, Reportes, Auditoría, Configuración), tres entidades de dominio principales (Cuenta Contable, Asiento Contable, Línea de Asiento) y dos catálogos compartidos de solo referencia (Usuario del ERP y Departamento del ERP).

**Integration Contract**: Las claves de usuario y departamento se manejan como cadenas opacas suministradas por un adaptador de identidad/organización. El adaptador expone sesión actual, permisos y catálogos de solo lectura; puede sustituirse por la implementación real del ERP sin cambiar el dominio financiero.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Calidad y mantenibilidad**: PASA. El diseño separa dominio puro (`src/domain/`), persistencia (`src/data/`), vistas (`src/views/`) y componentes (`src/components/`). Las reglas contables se concentran en funciones pequeñas y comprobables; las vistas no contienen reglas de negocio.
- **II. Pruebas y verificación**: PASA. Se planifican pruebas unitarias para dinero, cuentas, asientos, ciclo de vida, reversas y reportes, y pruebas de integración jsdom para formularios, persistencia, permisos y estados vacíos. La suite obsoleta del módulo base se reemplazará por pruebas del módulo financiero.
- **III. Consistencia de experiencia**: PASA. Se conserva el shell existente (barra superior, barra lateral, tokens CSS) y se definen estados de carga, vacío, validación y error consistentes en todas las vistas, con terminología en español.
- **IV. Rendimiento y confiabilidad**: PASA. Las consultas y métricas se derivan de selectores puros sobre los datos persistidos; se evita el trabajo bloqueante y se establecen objetivos para 500 asientos. La persistencia usa una única escritura atómica por comando y validación de esquema al cargar.

No se identifican violaciones que requieran justificación.

## Project Structure

### Documentation (this feature)

```text
specs/002-contabilidad-finanzas/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones e investigación
├── data-model.md        # Fase 1: modelo de datos y reglas
├── quickstart.md        # Fase 1: guía de validación de extremo a extremo
├── contracts/
│   ├── finance-storage.md   # Contrato de persistencia local
│   └── domain-rules.md      # Contrato de comandos, estados y permisos
├── checklists/
│   └── requirements.md  # Calidad de la especificación
└── tasks.md             # Fase 2: generado por /speckit.tasks
```

### Source Code (repository root)

```text
index.html                     # Shell ERP existente: sidebar, topbar, page-wrap y tokens visuales
src/
├── main.js                    # Punto de entrada mínimo: inicializa la aplicación
├── app.js                     # createApp/initApp, registro de vistas y enrutamiento por data-view
├── shell.js                   # Comportamiento del shell: navegación activa, toast, colapso lateral
├── router.js                  # Resolución de data-view -> vista y estado aria-current
├── styles.css                 # Tokens existentes + estilos de tablas, formularios, estados y modales
├── config/
│   └── finance-config.js      # Moneda, estados, transiciones, permisos, claves de almacenamiento
├── domain/
│   ├── money.js               # Análisis, formateo y aritmética con escala fija de 4 decimales
│   ├── accounts.js            # Validación de cuentas, jerarquía y detección de ciclos
│   ├── entries.js             # Encabezado, líneas y validación de partida doble
│   ├── lifecycle.js           # Transiciones, aprobación, contabilización, reversas y auditoría
│   └── reports.js             # Métricas del panel, flujo de caja y filtros
├── data/
│   ├── storage.js             # Adaptador de localStorage, versión de esquema y migraciones
│   ├── accounts-repository.js # Operaciones de cuentas sobre el estado persistido
│   ├── entries-repository.js  # Operaciones de asientos sobre el estado persistido
│   └── shared-directory.js    # Adaptador de usuarios/departamentos del ERP (solo referencia)
├── views/
│   ├── dashboard.js           # Panel con métricas derivadas y transacciones recientes
│   ├── transactions.js        # Lista, filtros, detalle y formulario de asientos
│   ├── accounts.js            # Catálogo jerárquico y CRUD de cuentas
│   ├── cost-centers.js        # Vista de imputación por departamento
│   ├── reports.js             # Estado de resultados y flujo de caja
│   ├── audit.js               # Historial de eventos y trazabilidad
│   └── settings.js            # Preferencias del período y configuración local
└── components/
    ├── account-form.js        # Formulario de cuenta con validación
    ├── entry-form.js          # Encabezado del asiento
    ├── entry-lines.js         # Editor dinámico de líneas Debe/Haber
    ├── filters.js             # Filtros combinados reutilizables
    ├── metric-cards.js        # Tarjetas de métricas del panel
    └── feedback.js            # Toasts, estados vacíos y mensajes de validación

tests/
├── setup/
│   └── dom.js                 # JSDOM, localStorage limpio y helper de arranque
├── unit/
│   ├── money.test.js
│   ├── accounts.test.js
│   ├── entries.test.js
│   ├── lifecycle.test.js
│   ├── reports.test.js
│   └── storage.test.js
└── integration/
    ├── dashboard.test.js
    ├── accounts.test.js
    ├── transactions.test.js
    ├── approvals-reversals.test.js
    └── filters.test.js
```

**Structure Decision**: Se conserva `index.html` como shell único y se mantiene la estructura visual central (`.app-shell`, `.sidebar`, `.topbar`, `.main-content`, `.page-wrap`, `data-view` y tokens CSS). La lógica financiera se separa en dominio puro, repositorios y vistas para que sea comprobable sin DOM. Las vistas dedicadas sustituyen el contenedor genérico de marcador de posición, manteniendo las mismas rutas de navegación existentes. La suite de pruebas obsoleta del módulo base (que referencia `src/app.js`, `src/storage.js` y `src/module-config.js` inexistentes) se reemplazará por la suite financiera descrita arriba; también se actualizarán `README.md` y el nombre del paquete para reflejar el módulo actual.

## Phase 0: Research Decisions

Las decisiones completas y sus alternativas están en [research.md](research.md). Resumen:

- **Dinero**: enteros con escala 4 (`1.2345` → `12345`) y lados `DEBIT`/`CREDIT`; se rechaza precisión excedida en lugar de redondear.
- **Persistencia**: una clave raíz versionada `erp:finance:state`, migraciones idempotentes y validación de esquema al cargar.
- **Ciclo de vida**: máquina de estados explícita con transiciones permitidas; los asientos contabilizados son inmutables y solo se corrigen mediante reversa enlazada.
- **Membresía contable**: los reportes incluyen asientos con `postedAt` no nulo (contabilizados y revertidos) para que una reversa nete a cero correctamente.
- **Identidad/permisos**: adaptador de sesión y catálogo de permisos (`finance.entry.approve`, `finance.entry.post`, etc.); el dominio comprueba permisos, no nombres de rol.
- **Jerarquía de cuentas**: `parentId` como relación autoritativa y detección de ciclos recorriendo la cadena de ancestros.
- **Pruebas**: dominio puro en Node y jsdom solo para integración; inyección de reloj, generador de IDs, almacenamiento e identidad.

## Phase 1: Design & Contracts

- Modelo de datos completo: [data-model.md](data-model.md)
- Contrato de persistencia: [contracts/finance-storage.md](contracts/finance-storage.md)
- Contrato de comandos, estados y permisos: [contracts/domain-rules.md](contracts/domain-rules.md)
- Guía de validación de extremo a extremo: [quickstart.md](quickstart.md)

## Post-Design Constitution Check

- **Calidad y mantenibilidad**: PASA. El modelo y los contratos definen límites claros entre dominio, datos y vistas; no hay reglas contables en la capa de presentación.
- **Pruebas y verificación**: PASA. Cada invariante del modelo tiene un caso de prueba identificable; los flujos críticos cuentan con escenarios de integración.
- **Consistencia de experiencia**: PASA. Las vistas comparten shell, terminología y patrones de estado vacío/error/validación.
- **Rendimiento y confiabilidad**: PASA. Los selectores de reportes y filtros se ejecutan sobre colecciones acotadas; la persistencia es atómica y versionada.

## Complexity Tracking

No se introdujeron violaciones a la constitución. No se requiere justificación adicional.
