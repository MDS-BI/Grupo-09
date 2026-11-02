### Historia de Usuario 1 - Dashboard Financiero (Prioridad: P1)
Como Gerente de Finanzas, quiero visualizar un panel con ingresos, gastos, resultado neto y flujo de caja, para conocer el estado de liquidez del negocio en tiempo real.
**Por qué esta prioridad**: Es el punto de entrada principal para la toma de decisiones financieras.
**Prueba Independiente**: Un usuario abre la aplicación y visualiza tarjetas de métricas financieras que se calculan agregando los importes de todos los asientos en estado "Contabilizada".
**Escenarios de Aceptación**:
1. Dado el panel de inicio y la existencia de asientos contabilizados, cuando el usuario entra a la vista, entonces las métricas de ingresos y gastos reflejan la suma exacta de las cuentas correspondientes.
2. Dado un sistema sin transacciones registradas, cuando se muestra el panel, entonces las estadísticas muestran $0.00.

### Historia de Usuario 2 - Gestión del Plan de Cuentas (Prioridad: P1)
Como Analista Contable, quiero administrar un catálogo jerárquico de cuentas (definiendo código, tipo, naturaleza y estado activo), para clasificar correctamente cada operación financiera.
**Por qué esta prioridad**: Sin cuentas contables, es imposible registrar transacciones (dependencia principal).
**Prueba Independiente**: Un usuario crea una cuenta, la edita y la visualiza en la lista general del catálogo.
**Escenarios de Aceptación**:
1. Dado el formulario de cuenta, cuando el usuario introduce un código único (ej. "1.1.1") y los datos requeridos, entonces la cuenta se persiste y aparece en el catálogo.
2. Dado un código de cuenta que ya existe, cuando el usuario intenta guardarlo, entonces se muestra un error de validación por duplicidad y no se persiste.

### Historia de Usuario 5 - Flujo de Aprobación de Asientos (Prioridad: P2)
Como Gerente de Finanzas, quiero revisar los asientos que están en estado "Borrador" o "Pendiente" para aprobarlos y contabilizarlos formalmente, garantizando que los movimientos cumplan con las políticas.
*Por qué esta prioridad*: Refleja los controles internos y segregación de funciones del mundo real.
*Prueba Independiente*: Un usuario con rol de aprobación cambia el estado de un asiento de "Pendiente" a "Aprobada", registrando su firma de auditoría.
*Escenarios de Aceptación*:
1. Dado un asiento en estado "Borrador", cuando se solicita aprobación, entonces cambia a "Pendiente" habilitando la revisión.
2. Dado un intento de transición de "Borrador" directamente a "Contabilizada" saltando políticas, entonces el sistema rechaza la transición.
