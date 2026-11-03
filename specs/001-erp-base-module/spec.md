# Feature Specification: Módulo de Contabilidad y Finanzas

**Feature Branch**: `002-contabilidad-finanzas`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Módulo de Contabilidad y Finanzas"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Panel financiero para la toma de decisiones (Priority: P1)

Como Gerente de Finanzas, quiero ver un panel con ingresos, gastos, resultado neto y flujo de caja del período, para conocer la situación de liquidez del negocio sin preparar reportes manuales.

**Why this priority**: Es el punto de entrada del módulo y el principal aporte de valor para la dirección; permite decidir con información actualizada.

**Independent Test**: Un usuario abre el módulo con asientos contabilizados existentes y comprueba que las tarjetas de métricas muestran los totales correspondientes; con el módulo vacío, todas las métricas muestran cero.

**Acceptance Scenarios**:

1. **Given** que existen asientos en estado "Contabilizada", **When** el usuario abre el panel, **Then** las métricas de ingresos, gastos, resultado neto y flujo de caja reflejan la suma de las cuentas correspondientes del período seleccionado.
2. **Given** que no existen asientos registrados, **When** el usuario abre el panel, **Then** todas las métricas se muestran en cero con un mensaje que invita a registrar el primer asiento.
3. **Given** que el usuario registra o contabiliza un asiento, **When** vuelve al panel, **Then** las métricas se actualizan sin necesidad de recargar manualmente la información.

---

### User Story 2 - Administración del plan de cuentas (Priority: P1)

Como Analista Contable, quiero administrar un catálogo jerárquico de cuentas con código, tipo, naturaleza y estado, para clasificar correctamente cada operación financiera.

**Why this priority**: Sin un plan de cuentas válido no es posible registrar asientos; es una dependencia directa de todo el módulo.

**Independent Test**: Un usuario crea una cuenta con código único, la edita, la desactiva y verifica que aparece o deja de estar disponible en el catálogo y en los formularios de registro.

**Acceptance Scenarios**:

1. **Given** el formulario de una cuenta nueva, **When** el usuario introduce un código único y los datos obligatorios, **Then** la cuenta se guarda y aparece en el catálogo.
2. **Given** un código de cuenta que ya existe, **When** el usuario intenta guardarlo, **Then** se muestra un error de duplicidad y no se modifica el catálogo.
3. **Given** una cuenta con movimientos registrados, **When** el usuario intenta eliminarla, **Then** el sistema lo impide y ofrece desactivarla en su lugar.
4. **Given** una cuenta padre, **When** el usuario la selecciona como cuenta superior de otra cuenta, **Then** el sistema evita crear ciclos en la jerarquía.

---

### User Story 3 - Registro de asientos por partida doble (Priority: P1)

Como Analista Contable, quiero registrar asientos con varias líneas exigiendo que el total del Debe sea igual al total del Haber, para garantizar la integridad de la información financiera.

**Why this priority**: Es la regla de negocio central del módulo y la base de la confiabilidad contable.

**Independent Test**: Un usuario crea un asiento con al menos dos líneas, verifica que se bloquea si está desbalanceado y que se guarda cuando el Debe y el Haber coinciden.

**Acceptance Scenarios**:

1. **Given** un asiento con al menos dos líneas y totales de Debe y Haber iguales, **When** el usuario lo guarda, **Then** el asiento se persiste en estado "Borrador".
2. **Given** un asiento con totales de Debe y Haber distintos, **When** el usuario intenta guardarlo, **Then** se bloquea la acción con un mensaje claro y no se persiste ninguna parte del asiento.
3. **Given** una línea de asiento, **When** el usuario intenta registrar un importe en Debe y en Haber a la vez, **Then** el sistema rechaza la línea e indica que debe elegir un solo lado.
4. **Given** un asiento con menos de dos líneas, **When** el usuario intenta guardarlo, **Then** el sistema exige al menos una línea de cargo y una de abono.

---

### User Story 4 - Auditoría, inmutabilidad y reversas (Priority: P1)

Como Auditor, quiero que los asientos contabilizados no puedan modificarse ni eliminarse y que las correcciones se realicen mediante un asiento de reversa enlazado, para mantener una pista de auditoría confiable.

**Why this priority**: Responde a una exigencia de control interno y trazabilidad; sin ella el módulo no es apto para uso contable real.

**Independent Test**: Un usuario intenta editar un asiento contabilizado y es bloqueado; luego ejecuta una reversa y comprueba que se crea un nuevo asiento con los lados invertidos y referencia al original.

**Acceptance Scenarios**:

1. **Given** un asiento en estado "Contabilizada", **When** el usuario intenta editar sus cuentas o importes, **Then** el sistema bloquea la edición e informa que debe usar una reversa.
2. **Given** un asiento en estado "Contabilizada", **When** el usuario ejecuta la acción "Revertir", **Then** se crea un nuevo asiento con los importes de Debe y Haber intercambiados y una referencia al asiento original.
3. **Given** un asiento que ya tiene una reversa, **When** el usuario intenta revertirlo nuevamente, **Then** el sistema lo impide y muestra la reversa existente.
4. **Given** cualquier cambio de estado de un asiento, **When** el usuario consulta su historial, **Then** ve quién realizó la acción y cuándo.

---

### User Story 5 - Flujo de aprobación de asientos (Priority: P2)

Como Gerente de Finanzas, quiero revisar los asientos en estado "Borrador" o "Pendiente" para aprobarlos y contabilizarlos formalmente, asegurando que cumplan las políticas internas.

**Why this priority**: Introduce los controles internos y la segregación de funciones propias de un proceso contable real.

**Independent Test**: Un usuario autorizado envía un borrador a revisión y otro usuario con permiso de aprobación lo aprueba y contabiliza, registrando su identidad y la fecha.

**Acceptance Scenarios**:

1. **Given** un asiento en estado "Borrador", **When** el usuario lo envía a revisión, **Then** cambia a "Pendiente" y queda disponible para aprobación.
2. **Given** un asiento en estado "Pendiente", **When** un usuario autorizado lo aprueba, **Then** cambia a "Aprobada" y se registra el aprobador y la fecha.
3. **Given** un asiento en estado "Borrador", **When** un usuario intenta contabilizarlo saltando la revisión y aprobación, **Then** el sistema rechaza la transición.
4. **Given** un usuario sin permiso de aprobación, **When** intenta aprobar o contabilizar un asiento, **Then** el sistema deniega la acción y no modifica el estado.

---

### User Story 6 - Consulta histórica y filtrado (Priority: P2)

Como Analista Contable, quiero buscar asientos por rango de fechas, cuenta, centro de costo y estado, para agilizar conciliaciones y análisis históricos.

**Why this priority**: Permite explotar la información registrada y es necesaria para el trabajo diario de conciliación.

**Independent Test**: Un usuario aplica un filtro de departamento y estado y obtiene únicamente los asientos que coinciden; al limpiar los filtros recupera la lista completa.

**Acceptance Scenarios**:

1. **Given** un conjunto de asientos registrados, **When** el usuario aplica uno o más filtros válidos, **Then** la lista muestra solo los asientos que cumplen todos los criterios.
2. **Given** un filtro sin coincidencias, **When** el usuario consulta, **Then** se muestra un estado vacío claro con la opción de limpiar los filtros.
3. **Given** una búsqueda por texto, **When** el usuario escribe parte de la descripción o del número de documento, **Then** la lista se actualiza con las coincidencias.

---

### Edge Cases

- Asiento con totales de Debe y Haber iguales pero sin líneas suficientes: debe rechazarse por no tener al menos dos líneas.
- Asiento con líneas que usan cuentas inactivas o que no aceptan movimientos: debe rechazarse antes de guardar.
- Asiento con importes negativos, cero o con más de cuatro decimales: debe rechazarse con un mensaje que indique el formato esperado.
- Código de cuenta duplicado, vacío o con formato no permitido: debe rechazarse sin alterar el catálogo.
- Intento de asignar una cuenta padre a sí misma o de generar un ciclo en la jerarquía: debe bloquearse.
- Intento de eliminar un usuario o departamento referenciado por asientos: debe bloquearse para preservar el historial.
- Dos usuarios intentan aprobar o contabilizar el mismo asiento al mismo tiempo: solo una acción debe tener efecto y la otra debe informar que el estado ya cambió.
- Reversa de un asiento ya revertido o de un asiento que no está contabilizado: debe rechazarse con una explicación.
- Filtro por un período sin movimientos: debe mostrarse un estado vacío, no un error.
- Usuario sin sesión o sin permisos suficientes: debe denegarse el acceso a las acciones correspondientes.
- Volumen de hasta 500 asientos en la consulta: la búsqueda y el filtrado deben seguir siendo fluidos.
- Cierre inesperado del navegador durante la edición: los datos ya guardados deben conservarse y los cambios no confirmados no deben aplicarse parcialmente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar un panel financiero con ingresos, gastos, resultado neto y flujo de caja calculados a partir de los asientos en estado "Contabilizada" del período seleccionado.
- **FR-002**: El sistema MUST mostrar todas las métricas en cero y un estado vacío comprensible cuando no existan asientos registrados.
- **FR-003**: El sistema MUST actualizar las métricas del panel cuando se registren, aprueben, contabilicen o reviertan asientos.
- **FR-004**: Los usuarios MUST poder crear, editar, desactivar y reactivar cuentas contables con código, nombre, tipo, naturaleza, cuenta padre y estado.
- **FR-005**: El sistema MUST garantizar que el código de cuenta sea único y obligatorio, conservándolo como texto para admitir códigos jerárquicos como "1.1.1".
- **FR-006**: El sistema MUST permitir jerarquías de cuentas y MUST impedir ciclos, autorreferencias y la asignación de cuentas inactivas como padre.
- **FR-007**: El sistema MUST permitir imputar movimientos únicamente a cuentas activas que acepten movimientos.
- **FR-008**: El sistema MUST impedir la eliminación de cuentas con movimientos asociados y MUST ofrecer su desactivación como alternativa.
- **FR-009**: Los usuarios MUST poder crear asientos con fecha contable, tipo y número de documento, descripción, moneda y al menos dos líneas de detalle.
- **FR-010**: Cada línea de asiento MUST registrar una cuenta, un importe de Debe o un importe de Haber, y opcionalmente un centro de costo y una glosa.
- **FR-011**: El sistema MUST rechazar líneas con importe en ambos lados, con importe nulo, negativo o con más de cuatro decimales.
- **FR-012**: El sistema MUST bloquear el guardado de cualquier asiento cuyo total de Debe no sea exactamente igual al total de Haber.
- **FR-013**: El sistema MUST rechazar asientos con menos de dos líneas, con cuentas inactivas o con referencias inexistentes a usuarios o departamentos.
- **FR-014**: El sistema MUST gestionar los estados "Borrador", "Pendiente", "Aprobada", "Contabilizada" y "Revertida" con transiciones permitidas y MUST impedir saltos de estado no autorizados.
- **FR-015**: El sistema MUST registrar al usuario creador, al usuario aprobador y las fechas de creación, aprobación y contabilización de cada asiento.
- **FR-016**: El sistema MUST impedir la edición y eliminación de asientos en estado "Contabilizada" o "Revertida".
- **FR-017**: El sistema MUST permitir corregir un asiento contabilizado únicamente mediante una reversa que invierta sus importes y lo referencie.
- **FR-018**: El sistema MUST permitir una sola reversa directa por asiento y MUST rechazar la reversa de asientos no contabilizados.
- **FR-019**: El sistema MUST registrar en el historial de cada asiento quién realizó cada cambio de estado y cuándo.
- **FR-020**: El sistema MUST denegar las acciones de aprobación y contabilización a usuarios sin los permisos correspondientes, sin depender únicamente de ocultar controles en la interfaz.
- **FR-021**: El sistema MUST referenciar usuarios y departamentos existentes del ERP sin duplicar sus catálogos ni almacenar credenciales.
- **FR-022**: El sistema MUST permitir asignar un centro de costo por línea de asiento cuando la política contable lo requiera, y MUST permitir su ausencia cuando no sea obligatorio.
- **FR-023**: El sistema MUST impedir la eliminación de usuarios o departamentos referenciados por asientos.
- **FR-024**: Los usuarios MUST poder consultar y filtrar asientos por rango de fechas, cuenta contable, centro de costo, estado y texto libre.
- **FR-025**: El sistema MUST mostrar un estado vacío claro con opción de limpiar filtros cuando una consulta no arroje resultados.
- **FR-026**: El sistema MUST usar una sola moneda por asiento, identificada con un código de tres letras, y MUST NOT realizar conversión cambiaria automática en esta versión.
- **FR-027**: El sistema MUST conservar los datos registrados al cerrar y volver a abrir el módulo, sin pérdidas ni duplicaciones.
- **FR-028**: El sistema MUST mostrar mensajes de validación claros y conservar los datos ya introducidos por el usuario cuando una operación sea rechazada.
- **FR-029**: El sistema MUST presentar la interfaz en español y mantener la navegación y el estilo del espacio de trabajo del ERP existente.

### Key Entities *(include if feature involves data)*

- **Cuenta Contable**: Representa una cuenta del catálogo. Atributos clave: código único, nombre, tipo (Activo, Pasivo, Patrimonio, Ingreso o Egreso), naturaleza (Debe o Haber), cuenta padre opcional, indicador de aceptación de movimientos y estado activo/inactivo.
- **Asiento Contable (Transacción)**: Encabezado de una operación financiera. Atributos clave: fecha contable, tipo y número de documento, descripción, moneda, estado, usuario creador, usuario aprobador, fechas de creación/aprobación/contabilización y referencia al asiento revertido cuando corresponda.
- **Línea de Asiento (Detalle de Transacción)**: Imputación individual de un asiento. Atributos clave: número de línea, cuenta contable, centro de costo opcional, importe de Debe, importe de Haber y glosa opcional.
- **Usuario del ERP (dependencia compartida)**: Identidad existente que se referencia como creador o aprobador. No se crea, duplica ni administra dentro del módulo financiero.
- **Departamento del ERP (dependencia compartida)**: Centro de costo existente que se referencia desde las líneas de asiento. No se crea, duplica ni administra dentro del módulo financiero.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede registrar un asiento balanceado de dos líneas en menos de 2 minutos desde que abre el formulario.
- **SC-002**: El 100% de los asientos desbalanceados o con menos de dos líneas son rechazados antes de persistirse.
- **SC-003**: Las métricas del panel reflejan los asientos contabilizados en un máximo de 2 segundos después de abrir la vista.
- **SC-004**: Al menos el 90% de los usuarios completa la creación de una cuenta válida en el primer intento.
- **SC-005**: El 100% de los cambios de estado de un asiento queda registrado con usuario y fecha.
- **SC-006**: Las consultas filtradas sobre 500 asientos devuelven resultados en menos de 1 segundo.
- **SC-007**: El 100% de los intentos de editar o eliminar un asiento contabilizado es bloqueado y redirigido a una reversa.
- **SC-008**: Al menos el 85% de los usuarios autorizados completa el flujo de aprobación de un asiento en menos de 1 minuto.
- **SC-009**: El 95% de las búsquedas con filtros válidos muestra resultados coincidentes sin incluir registros ajenos al criterio.
- **SC-010**: Ningún asiento contabilizado pierde su trazabilidad ni queda sin reversa disponible tras una corrección.

## Assumptions

- La interfaz se presenta en español y reutiliza la barra superior, la navegación lateral y los estilos del espacio de trabajo ERP existente.
- El módulo opera sobre una sola empresa o instancia contable y una sola moneda por asiento; la conversión multimoneda queda fuera de esta versión.
- Los usuarios y departamentos ya existen en el ERP anfitrión y el módulo solo los referencia; no se duplican sus catálogos ni se gestionan credenciales.
- La autenticación y los permisos por rol son provistos por el ERP anfitrión; el módulo consume esa identidad para la auditoría y el control de acceso.
- El estándar contable aplicable es el de partida doble general; no se implementan reglas fiscales específicas de un país en esta versión.
- Los importes se registran con precisión decimal exacta de hasta cuatro decimales y no se usa aritmética de punto flotante para cálculos monetarios.
- El flujo de aprobación requiere que un asiento pase por "Pendiente" y "Aprobada" antes de "Contabilizada"; no se permiten saltos de estado.
- Un asiento contabilizado es inmutable y solo puede corregirse mediante una reversa enlazada; no se elimina físicamente.
- Las cuentas con movimientos se desactivan en lugar de eliminarse, y los usuarios o departamentos referenciados no pueden borrarse.
- Quedan fuera de esta versión la conciliación bancaria automática, los impuestos configurables, el cierre de períodos y la integración automática con documentos de facturación.
- La persistencia se mantiene entre sesiones del usuario; no se requiere un servidor central para esta versión del módulo.
- Se espera un volumen inicial de hasta 500 asientos consultables sin degradación perceptible para el usuario.