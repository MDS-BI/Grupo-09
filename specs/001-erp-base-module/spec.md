# Feature Specification: Módulo de Contabilidad y Finanzas

**Feature Branch**: `001-erp-base-module`

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

### User Story 7 - Imputación y Control por Centros de Costo (Priority: P2)

Como Gerente de Finanzas, quiero imputar las líneas de los asientos a los departamentos del catálogo ERP y visualizar el total de ingresos y gastos por cada área, para evaluar el desempeño financiero de cada departamento.

**Why this priority**: Explota la integración con el catálogo organizacional del ERP anfitrión y habilita la vista de Centros de Costo.

**Independent Test**: Un usuario contabiliza asientos asociados a distintos departamentos y verifica en la vista "Centros de costo" que los totales coinciden con lo imputado a cada área.

**Acceptance Scenarios**:

1. **Given** un conjunto de asientos en estado "Contabilizada" asignados a diferentes departamentos, **When** el usuario accede a la vista de Centros de Costo, **Then** se muestran los montos acumulados de ingresos, gastos y saldo neto agrupados por departamento.
2. **Given** un departamento registrado en el catálogo ERP que aún no tiene movimientos contabilizados, **When** se consulta la vista, **Then** aparece listado con saldos en $0.00 sin generar errores.

---

### User Story 8 - Generación de Estado de Resultados y Flujo de Caja (Priority: P2)

Como Gerente de Finanzas, quiero generar un reporte de Estado de Resultados y otro de Flujo de Caja filtrados por período contable, para analizar la rentabilidad y liquidez de la empresa de forma estructurada.

**Why this priority**: Consolida la información de las cuentas activas en reportes financieros formales más allá de las tarjetas del panel general.

**Independent Test**: Un usuario selecciona un rango de fechas en la vista "Reportes" y comprueba que el sistema desglosa las cuentas con movimiento y calcula la utilidad o pérdida neta exacta.

**Acceptance Scenarios**:

1. **Given** un período seleccionado con asientos en estado "Contabilizada", **When** el usuario consulta el Estado de Resultados, **Then** el sistema agrupa los saldos por cuenta de ingreso y gasto y calcula el resultado neto con precisión exacta de 4 decimales.
2. **Given** que existen asientos en estado "Borrador" o "Pendiente" dentro del mismo período, **When** se generan los reportes, **Then** esos asientos son excluidos del cálculo hasta ser contabilizados.

---

### User Story 9 - Protección de Jerarquía e Integridad del Plan de Cuentas (Priority: P2)

Como Analista Contable, quiero que el sistema impida eliminar cuentas que ya tienen movimientos asociados o crear relaciones padre-hijo circulares, ofreciendo la desactivación como alternativa segura, para preservar la consistencia histórica del catálogo.

**Why this priority**: Evita referencias huérfanas en asientos antiguos y errores de recursión infinita en el árbol jerárquico.

**Independent Test**: Un usuario intenta eliminar una cuenta con asientos registrados y el sistema bloquea el borrado permitiéndole únicamente desactivarla.

**Acceptance Scenarios**:

1. **Given** una cuenta contable que posee al menos una línea de asiento registrada, **When** el usuario intenta eliminarla, **Then** el sistema rechaza el borrado y sugiere cambiar su estado a inactiva.
2. **Given** una cuenta padre A y una cuenta hija B, **When** el usuario intenta asignar a B como cuenta padre de A (ciclo) o a una cuenta consigo misma, **Then** el sistema bloquea la operación con un mensaje de validación.

---

### User Story 10 - Bitácora Cronológica de Eventos de Auditoría (Priority: P3)

Como Auditor, quiero consultar un registro cronológico e inmutable de todas las acciones críticas realizadas en el módulo (creación, envío a revisión, aprobación, contabilización, reversas y cambios en cuentas), para verificar quién ejecutó cada operación y cuándo.

**Why this priority**: Complementa la inmutabilidad de los asientos dando trazabilidad completa a nivel de sesión de usuario en la vista de Auditoría.

**Independent Test**: Un usuario realiza el ciclo completo de un asiento (crear, aprobar, contabilizar y revertir) y verifica en la vista "Auditoría" que cada paso quedó registrado con su marca de tiempo y usuario.

**Acceptance Scenarios**:

1. **Given** que un usuario ejecuta una transición de estado sobre un asiento o modifica el plan de cuentas, **When** la operación persiste en el almacenamiento local, **Then** se registra automáticamente un evento en la bitácora con tipo de acción, fecha/hora, entidad afectada e identificador del usuario activo.
2. **Given** el listado de eventos en la vista "Auditoría", **When** cualquier usuario inspecciona los registros, **Then** la interfaz los muestra en modo solo lectura sin controles de edición ni borrado.

---

### User Story 11 - Validación Estricta de Líneas e Importes Monetarios (Priority: P2)

Como Analista Contable, quiero que el formulario de asientos valide en tiempo real que cada línea utilice una cuenta activa, tenga un importe positivo mayor a cero y respete el límite máximo de cuatro decimales, para prevenir errores de digitación antes de guardar.

**Why this priority**: Asegura el cumplimiento de la aritmética de escala fija de 4 decimales y evita imputaciones a cuentas deshabilitadas.

**Independent Test**: Un usuario intenta ingresar un monto negativo, un valor con cinco decimales o seleccionar una cuenta inactiva en el editor de líneas y recibe una alerta inmediata.

**Acceptance Scenarios**:

1. **Given** el editor de líneas de un asiento, **When** el usuario introduce un importe con más de 4 decimales (ej. "100.12345") o un valor menor o igual a cero, **Then** el sistema rechaza el valor con un mensaje claro sin redondearlo automáticamente.
2. **Given** una cuenta contable marcada como inactiva, **When** el usuario despliega el selector de cuentas en una línea de asiento, **Then** la cuenta inactiva no está disponible para imputación.

---

### User Story 12 - Configuración del Período Contable y Respaldo de Estado Local (Priority: P3)

Como Gerente de Finanzas, quiero configurar el período contable activo por defecto y verificar la integridad del almacenamiento local del módulo, para mantener el contexto de trabajo entre sesiones del navegador sin pérdida de datos.

**Why this priority**: Da utilidad real a la vista de Configuración y asegura que el esquema versionado en `localStorage` sobreviva al cierre del navegador.

**Independent Test**: Un usuario modifica las preferencias del período en la vista "Configuración", cierra la pestaña del navegador, vuelve a abrir el ERP y comprueba que tanto su configuración como los asientos registrados permanecen intactos.

**Acceptance Scenarios**:

1. **Given** la vista "Configuración", **When** el usuario define el período contable activo y guarda los cambios, **Then** las vistas de Panel General y Reportes toman ese período por defecto al cargarse.
2. **Given** un estado financiero previamente guardado en el navegador, **When** el usuario cierra y reabre la aplicación, **Then** el sistema valida la versión del esquema y restaura todas las cuentas, asientos y eventos sin pérdida de precisión.

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
- **FR-005**: El sistema MUST garantizar que el código de cuenta sea único y obligatorio, conservándolo como texto. **Estado actual de la implementación**: el formato aceptado admite un único segmento decimal (por ejemplo "1.1"), no códigos jerárquicos de varios niveles como "1.1.1"; ampliar el formato a jerarquías multinivel queda pendiente.
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
- **FR-030**: El sistema MUST mostrar en la vista de Centros de Costo los totales de ingresos, gastos y saldo neto por cada departamento del catálogo ERP, calculados únicamente a partir de asientos en estado "Contabilizada" del período seleccionado. Los departamentos sin movimientos MUST mostrarse con $0.00 y las líneas sin centro de costo MUST agruparse en una categoría explícita "Sin departamento", de modo que la suma por departamento concilie con los totales de ingresos y gastos del período (consolida FR-010, FR-022 y FR-024).
- **FR-031**: El sistema MUST generar un Estado de Resultados por período que agrupe los saldos de las cuentas de tipo Ingreso y Egreso con movimientos contabilizados, excluya los asientos en estado distinto de "Contabilizada" y calcule la utilidad o pérdida neta con precisión decimal exacta de cuatro decimales (consolida el cálculo de resultado neto de FR-001).
- **FR-032**: El sistema MUST generar un Flujo de Caja por período a partir de las cuentas designadas como efectivo/bancos, usando el mismo conjunto de asientos contabilizados que FR-001 y FR-031, y MUST excluir los asientos en estado "Borrador", "Pendiente", "Aprobada" y "Revertida".
- **FR-033**: La designación de cuentas de efectivo/bancos MUST basarse en el atributo explícito `es_efectivo` de Cuenta_Contable y no en el nombre o código de la cuenta; el mismo criterio MUST alimentar el flujo de caja del panel (FR-001) y el reporte de Flujo de Caja (FR-032) para evitar discrepancias entre ambas vistas. La designación aplicable es la vigente en el catálogo al momento de calcular, y todo cambio del atributo MUST quedar auditado.
- **FR-034**: El sistema MUST impedir la eliminación de cualquier cuenta referenciada por al menos una línea de asiento, independientemente del estado del asiento (incluidos "Borrador" y "Pendiente"), y MUST ofrecer su desactivación como alternativa segura; esta regla consolida y amplía FR-008.
- **FR-035**: La validación de jerarquía MUST impedir autorreferencias y ciclos directos o indirectos al asignar una cuenta padre, MUST ejecutarse en la capa de servicio y MUST proteger el recorrido del árbol frente a datos heredados con ciclos sin provocar recursión infinita; consolida y endurece FR-006.
- **FR-036**: El sistema MUST validar cada línea de asiento antes y durante el guardado: cuenta activa y que acepte movimientos, exactamente un lado (Debe xor Haber), importe mayor que cero y máximo cuatro decimales. Los valores nulos, negativos, cero o con más de cuatro decimales MUST rechazarse con un mensaje claro, sin redondeo automático, conservando los datos ya introducidos y excluyendo las cuentas inactivas o no imputables de los selectores; consolida FR-007, FR-011 y FR-028.
- **FR-037**: El sistema MUST mantener una bitácora global e inmutable de eventos críticos que registre tipo de acción, fecha/hora, identificador del usuario activo y entidad afectada para la creación, transición de estado y reversa de asientos, así como para la creación, edición, desactivación y reactivación de cuentas. La vista de Auditoría MUST ser de solo lectura y MUST NOT ofrecer controles de edición o borrado; el historial por asiento exigido por FR-019 MUST resolverse como una consulta filtrada de esta misma bitácora.
- **FR-038**: Los usuarios MUST poder configurar y persistir un período contable activo (rango de fechas con presets de mes, trimestre o rango personalizado) que el Panel General y los Reportes MUST usar como período por defecto al cargarse; los valores inválidos o invertidos MUST rechazarse conservando la configuración anterior.
- **FR-039**: El sistema MUST versionar el esquema de `localStorage`, validar la versión y la forma de los datos al cargar, migrar los estados sin versión de forma segura y restaurar cuentas, asientos y eventos sin pérdida, duplicación ni degradación de precisión. Ante una versión incompatible MUST conservar los datos existentes e informar al usuario, sin descartarlos silenciosamente; consolida y amplía FR-027.
- **FR-040**: La vista de Configuración MUST mostrar el estado del almacenamiento local con la versión de esquema activa y los recuentos de cuentas, asientos y eventos, para que el usuario pueda verificar la integridad del respaldo local (FR-027, FR-039).

**Consolidación con US1–US6**: FR-030–FR-033 reutilizan la fuente de asientos contabilizados y la regla de resultado/flujo de caja de FR-001; FR-034–FR-035 endurecen FR-006/FR-008 sin crear validaciones paralelas; FR-036 consolida FR-007/FR-011/FR-028; FR-037 reemplaza el historial aislado de FR-019 por una única bitácora global; FR-038–FR-040 amplían FR-027. Las reglas anteriores permanecen vigentes como base y no deben implementarse dos veces.

### Key Entities *(include if feature involves data)*

- **Cuenta Contable**: Representa una cuenta del catálogo. Atributos clave: código único, nombre, tipo (Activo, Pasivo, Patrimonio, Ingreso o Egreso), naturaleza (Debe o Haber), cuenta padre opcional, indicador de aceptación de movimientos, designación explícita de efectivo/bancos (`es_efectivo`) y estado activo/inactivo.
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
- **SC-011**: El 100% de los asientos contabilizados con centro de costo se refleja en la vista de Centros de Costo; los totales por departamento más la categoría "Sin departamento" concilian con los totales de ingresos y gastos del período, los departamentos sin movimientos muestran $0.00 y la vista se genera en menos de 2 segundos para 500 asientos contabilizados.
- **SC-012**: El Estado de Resultados y el Flujo de Caja se generan en menos de 2 segundos para 500 asientos contabilizados, con resultado neto exacto a cuatro decimales y 0 asientos no contabilizados incluidos.
- **SC-013**: El 100% de las cifras de flujo de caja del Panel General y del reporte de Flujo de Caja usa el mismo atributo de cuenta de efectivo/bancos, con 0 discrepancias entre ambas vistas.
- **SC-014**: El 100% de los intentos de eliminar cuentas referenciadas por asientos (en cualquier estado) se bloquea y ofrece desactivación; 0 ciclos o autorreferencias quedan persistidos en la jerarquía.
- **SC-015**: El 100% de los importes nulos, negativos, cero o con más de cuatro decimales se rechaza antes de persistir sin redondeo, y 0 cuentas inactivas o no imputables aparecen disponibles para selección en líneas de asiento; la validación de cada cambio de línea se actualiza en un máximo de 100 ms.
- **SC-016**: El 100% de las acciones críticas sobre asientos y cuentas queda registrado en la bitácora con usuario y fecha/hora en un máximo de 1 segundo; 0 eventos de auditoría pueden editarse o eliminarse desde la interfaz.
- **SC-017**: El período contable guardado persiste en el 100% de los recargos y es usado como período por defecto por el Panel General y los Reportes; 0 configuraciones inválidas se almacenan.
- **SC-018**: Tras cerrar y reabrir la aplicación, el 100% de cuentas, asientos y eventos se restaura con la precisión original y sin duplicaciones; ante una versión de esquema incompatible, 0 registros existentes se descartan silenciosamente y el usuario recibe una explicación.

## Assumptions

- La interfaz se presenta en español y reutiliza la barra superior, la navegación lateral y los estilos del espacio de trabajo ERP existente.
- El módulo opera sobre una sola empresa o instancia contable y una sola moneda por asiento; la conversión multimoneda queda fuera de esta versión.
- Los usuarios y departamentos ya existen en el ERP anfitrión y el módulo solo los referencia; no se duplican sus catálogos ni se gestionan credenciales.
- La intención de diseño es que la autenticación y los permisos por rol sean provistos por el ERP anfitrión. **Estado actual de la implementación**: el módulo incluye su propia pantalla de inicio de sesión sobre el catálogo compartido de usuarios, con una contraseña de demostración única y visible en pantalla (no credenciales individuales reales), pensada como sustituto temporal mientras no se integre el inicio de sesión del ERP anfitrión. El control de acceso por rol (Administrador, Contador, Empleado) sí se aplica en código de la aplicación antes de ejecutar acciones sensibles, no solo ocultando botones.
- El estándar contable aplicable es el de partida doble general; no se implementan reglas fiscales específicas de un país en esta versión.
- Los importes se registran con precisión decimal exacta de hasta cuatro decimales y no se usa aritmética de punto flotante para cálculos monetarios.
- El flujo de aprobación requiere que un asiento pase por "Pendiente" y "Aprobada" antes de "Contabilizada"; no se permiten saltos de estado.
- Un asiento contabilizado es inmutable y solo puede corregirse mediante una reversa enlazada; no se elimina físicamente.
- Las cuentas con movimientos se desactivan en lugar de eliminarse, y los usuarios o departamentos referenciados no pueden borrarse.
- Quedan fuera de esta versión la conciliación bancaria automática, los impuestos configurables, el cierre de períodos y la integración automática con documentos de facturación.
- La persistencia se mantiene entre sesiones del usuario; no se requiere un servidor central para esta versión del módulo.
- Se espera un volumen inicial de hasta 500 asientos consultables sin degradación perceptible para el usuario.

## Limitaciones Conocidas de la Implementación Actual

*(Sección agregada el 2026-11-26 al sincronizar esta especificación con el código. Describe brechas confirmadas entre el comportamiento esperado por los requisitos anteriores y el comportamiento real del sistema hoy; no reemplaza ni debilita esos requisitos, que siguen vigentes como objetivo. El detalle técnico de cada punto está en `plan.md` y `data-model.md`; el trabajo pendiente está rastreado en `tasks.md`.)*

- **Autenticación (FR-021, Assumptions)**: el inicio de sesión actual usa una contraseña de demostración compartida y visible en pantalla, no un mecanismo de credenciales individuales del ERP anfitrión.
- **Designación de efectivo/bancos (FR-033, SC-013)**: el Panel General aplica una regla adicional basada en tipo y código de cuenta para ingresos de caja, mientras que el reporte de Flujo de Caja usa únicamente la designación explícita `es_efectivo`; ambas vistas pueden divergir en catálogos con varias cuentas de tipo Activo no marcadas como efectivo.
- **Integridad de cuentas referenciadas (FR-034, SC-014)**: hoy se bloquea el borrado de una cuenta referenciada por asientos en Borrador, Pendiente o Aprobada, pero **no** se bloquea el borrado de una cuenta referenciada únicamente por asientos ya Contabilizados o Revertidos, que es el caso que más debería protegerse para preservar la trazabilidad histórica.
- **Protección de jerarquía (FR-035)**: la prevención de ciclos y autorreferencias al asignar una cuenta padre ocurre únicamente en el formulario de cuentas, no en una capa reutilizable de validación de datos; la asignación de una cuenta inactiva como padre tampoco se bloquea de forma explícita.
- **Borrado de usuarios y departamentos referenciados (FR-021, FR-023)**: no se verifica si un usuario o departamento está referenciado por algún asiento antes de permitir su eliminación del catálogo compartido.
- **Bitácora de auditoría de cuentas (FR-037, SC-016)**: la creación, edición, desactivación y reactivación de cuentas no quedan registradas en la bitácora global de auditoría; solo las acciones sobre asientos (creación, aprobación, contabilización, reversa) se reflejan hoy en la vista de Auditoría.
- **Período contable por defecto (FR-038)**: la vista de Configuración ofrece los presets de mes, trimestre y rango personalizado, pero Reportes y Centros de Costo permiten además seleccionar año y año anterior directamente en su propio filtro, fuera del período configurado por defecto.
- **Validación del esquema local (FR-039)**: la versión del esquema de `localStorage` se verifica por presencia/igualdad, pero los datos almacenados no se validan en forma ni tipo al cargar.
- **Aritmética monetaria (Assumptions)**: el límite de cuatro decimales y el rechazo sin redondeo se aplican al capturar un importe; los cálculos internos posteriores (sumas, balance, reversas) todavía usan aritmética de punto flotante estándar en lugar de una representación decimal exacta de extremo a extremo.
- **Capacidad no contemplada originalmente**: el Panel General incluye una función de exportación a CSV no descrita en los requisitos funcionales anteriores.
- **Cobertura de pruebas automatizadas**: algunas pruebas unitarias y de integración existentes no verifican aún el comportamiento que su nombre describe (aserciones vacías o que siempre pasan); esto no reduce el alcance de los requisitos, pero significa que su cumplimiento no está hoy confirmado por esas pruebas específicas.