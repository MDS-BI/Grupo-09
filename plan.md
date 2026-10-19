# Plan de Trabajo: Módulo de Contabilidad y Finanzas

## 1. Descripción del Problema y Solución Propuesta
**El Problema:** 
La falta de un registro contable centralizado y estandarizado genera asimetrías de información, pérdida de trazabilidad en los gastos e ingresos (flujo de caja ciego) y un alto riesgo de errores u omisiones en la conciliación bancaria. Además, sin una correcta separación de roles, la información financiera está expuesta a manipulaciones.

**La Solución (MVP):** 
Un módulo de gestión financiera centralizado e integrado al ERP principal. El MVP permitirá registrar asientos contables (ingresos y egresos), clasificarlos mediante un "Plan de Cuentas" estandarizado y asociar cada movimiento a los distintos departamentos (centros de costo). Contará con un *dashboard* que muestre el estado de resultados básico y el flujo de caja en tiempo real.

## 2. Usuarios Potenciales y Alcance
El sistema utilizará la gestión de identidad base del ERP para habilitar los siguientes perfiles (Control de Acceso Basado en Roles - RBAC):
*   **Gerente de Finanzas (CFO) / Administrador:** Acceso total (CRUD). Puede crear nuevas cuentas contables, aprobar transacciones de alto valor, modificar presupuestos de departamentos y visualizar todos los reportes financieros.
*   **Analista Contable:** Permisos de lectura y escritura operativos. Puede ingresar nuevas transacciones (compras, ventas, pagos), pero no puede borrar registros históricos ni alterar la estructura del plan de cuentas.
*   **Auditor (Interno/Externo):** Perfil de solo lectura general. Su propósito es poder trazar el origen, fecha y autor de cada transacción para asegurar el cumplimiento normativo sin capacidad de alterar los datos.

## 3. Manejo de Riesgos, Sesgos y Datos Sensibles
El módulo maneja el capital de la empresa, por lo que la arquitectura prioriza la seguridad y la objetividad:
*   **Trazabilidad Inmutable (Auditoría):** Todo registro financiero guardará un *timestamp* y el ID del usuario que lo creó. A nivel de diseño metodológico, en lugar de permitir el borrado (`DELETE`) de una transacción errónea, se forzará la creación de una "transacción de reversa", eliminando el riesgo de fraude por eliminación de datos.
*   **Mitigación de Sesgos en la Clasificación:** Al requerir que toda transacción se asocie a un Plan de Cuentas estricto predefinido (ej. evitar cuentas genéricas como "Varios"), se reduce el sesgo del operador de ocultar gastos específicos.
*   **Protección de Datos Estratégicos:** La información de los márgenes de ganancia y el flujo de caja son datos comerciales sensibles. El sistema aísla esta información para que usuarios de otros módulos (ej. Ventas o RRHH) no puedan consultarlos.

## 4. Justificación Metodológica de la Base de Datos
Para este módulo, el uso de una base de datos relacional (SQL) es **estrictamente necesario**. Las finanzas requieren cumplir con las propiedades ACID (Atomicidad, Consistencia, Aislamiento y Durabilidad) para garantizar que si un movimiento falla (por ejemplo, un débito se procesa pero el crédito correspondiente no), toda la transacción se cancele, evitando desbalances financieros. 
Para mantener la escalabilidad e integridad del ERP, el módulo reutiliza las tablas de `Usuario_Base` (para auditoría y login) y `Departamento_Base` (que aquí actuarán como Centros de Costo para agrupar los gastos presupuestarios).