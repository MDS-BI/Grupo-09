# Plan de Trabajo — Módulo de Contabilidad y Finanzas

## 1. Propósito y problema

La ausencia de un registro financiero central dificulta conocer el flujo de caja, clasificar los ingresos y gastos, conciliar movimientos y determinar quién creó o aprobó cada asiento. La edición o eliminación sin rastro añade riesgo de error y fraude.

El módulo propuesto centraliza el registro de asientos de doble partida, clasifica cada línea en un plan de cuentas, permite imputar gastos a departamentos existentes y presenta indicadores financieros. El Modelo Entidad-Relación y sus restricciones están descritos en [data-model.md](data-model.md).

## 2. Objetivos y alcance del MVP

### Incluido

1. Consultar un dashboard con ingresos, gastos, resultado neto, saldo disponible, flujo de caja y transacciones recientes calculados a partir de asientos contabilizados.
2. Administrar un plan jerárquico de cuentas, con código único, tipo, naturaleza, estado activo y distinción entre cuentas imputables y cuentas agrupadoras.
3. Crear asientos con encabezado y dos o más líneas Debe/Haber, fecha contable, comprobante, descripción, moneda y centro de costo opcional.
4. Validar que cada asiento contabilizado esté balanceado, tenga cuentas activas y respete permisos; permitir flujo de borrador, aprobación y contabilización.
5. Corregir un asiento contabilizado mediante una reversa enlazada, preservando el original y su auditoría en vez de editarlo o eliminarlo.
6. Consultar transacciones por fecha, cuenta, centro de costo, estado y autor; exportación básica de resultados queda como objetivo secundario si el tiempo lo permite.
7. Reutilizar la identidad y los departamentos del ERP anfitrión mediante referencias a sus claves. No duplicar usuarios, credenciales, departamentos ni presupuestos compartidos.

### Fuera del MVP

Conciliación bancaria automática, multimoneda con conversión, cuentas por cobrar/pagar integradas automáticamente con `Document`, facturación fiscal, cierres de período y cumplimiento de un estándar contable o tributario de un país específico. Se dejan como extensiones hasta confirmar normativa y contratos de integración.

## 3. Usuarios, permisos y controles

| Perfil | Permisos propuestos |
|---|---|
| Gerente de Finanzas / Administrador | Consultar reportes; administrar cuentas; aprobar y contabilizar según política; consultar auditoría; gestionar presupuestos únicamente mediante el dato compartido del departamento y si el ERP lo permite. |
| Analista Contable | Crear y editar borradores; enviar a aprobación; consultar transacciones operativas. No elimina ni modifica asientos contabilizados ni administra la estructura del plan de cuentas. |
| Auditor | Lectura de asientos, detalles, autores, aprobaciones y reversas; sin crear, editar, aprobar ni contabilizar. |

La autorización real se valida en backend/servicio usando la identidad y el rol del ERP. La interfaz solo refleja los permisos y no se considera una barrera de seguridad. El umbral de aprobación de alto valor y el mapeo exacto de roles se definirán con el responsable del ERP antes de implementar el flujo.

## 4. Compatibilidad con la estructura base

- `Usuario_Base`: se reutiliza la clave de usuario del ERP para creador y aprobador; no se copian email, contraseña ni credenciales. Los nombres y tipos de clave están pendientes de confirmación: el modelo base publicado en `specs/001-erp-base-module/data-model.md` describe `Entity` y `Document`, no esta tabla.
- `Departamento_Base`: se reutiliza la clave de departamento como centro de costo en cada detalle. No se crea un catálogo financiero duplicado. La existencia de `presupuesto_asignado` deberá verificarse con el contrato vigente del ERP antes de usarlo.
- `Entity` y `Document` del módulo base no se alteran en el MVP. Una futura asociación a documentos fuente requiere acordar el identificador y el ciclo de vida entre ambos módulos; el número de comprobante del asiento es texto de referencia en esta fase, no una FK inventada.
- Antes de crear claves foráneas físicas, confirmar si los módulos comparten base relacional. Si se comunican mediante servicios separados, validar las claves a través de integración, sin simular una FK cross-database.

## 5. Enfoque técnico y decisiones

- **Interfaz existente:** Vite, HTML, CSS y JavaScript vanilla. El frontend inicial creado para este módulo contiene un dashboard visual de demostración, navegación y búsqueda limitada a filas de ejemplo; no debe presentarse como persistencia o contabilidad funcional.
- **Persistencia financiera propuesta:** servicio/API conectado a una base de datos relacional SQL con transacciones ACID. No guardar asientos financieros únicamente en `localStorage`: el registro debe ser consistente, autorizado y durable. El motor SQL y el backend no están seleccionados en el repositorio y deben decidirse con el equipo anfitrión.
- **Integridad:** una operación de contabilización guarda estado y líneas dentro de una única transacción de base de datos y rechaza el asiento si la suma Debe difiere de Haber. Los importes se almacenan en `DECIMAL`, no en coma flotante binaria.
- **Separación de responsabilidades:** UI para presentación/validación de interacción; servicio para permisos, reglas y casos de uso; SQL para claves, restricciones, transacciones y persistencia.
- **Referencia de diseño de datos:** [data-model.md](data-model.md), que fija entidades, cardinalidades, reglas de auditoría, reversas y decisiones abiertas.

## 6. Etapas de trabajo y entregables

| Etapa | Prioridad | Trabajo | Entregable / verificación |
|---|---|---|---|
| 0. Alineación de contratos | Bloqueante | Confirmar claves, tipos, roles y disponibilidad de `Usuario_Base`, `Departamento_Base`, presupuesto y mecanismo de autenticación; decidir motor SQL/backend y moneda/país de prueba. | Contrato de integración y decisiones registradas; no duplicar datos base. |
| 1. Modelo y persistencia | P1 | Crear tablas financieras, claves, índices y restricciones; preparar datos semilla de cuentas/departamentos; integrar identidad. | Migraciones revisables; pruebas de FKs, unicidad, restricciones y rollback ACID. |
| 2. Plan de cuentas | P1 | Listar, crear y desactivar cuentas; soportar jerarquía y seleccionar cuentas imputables. | Pruebas de código único, cuenta padre y bloqueo de uso de cuentas inactivas/agrupadoras. |
| 3. Registro de asientos | P1 | Crear borrador con líneas, validarlo, enviar a aprobación y contabilizar con permisos. | Pruebas de asiento balanceado/desbalanceado, mínimo de líneas, validación por rol y atomicidad ante fallo. |
| 4. Reversa y auditoría | P1 | Revertir asientos contabilizados sin borrar el original; registrar autor, aprobador, fechas y motivo. | Pruebas de reversa balanceada, referencia única, inmutabilidad y trazabilidad completa. |
| 5. Dashboard y consultas | P1 | Sustituir datos demostrativos por agregados reales; filtrar transacciones y mostrar estado de resultados/flujo de caja básico. | Validar importes del panel contra un conjunto de asientos conocidos y filtros por período/cuenta/centro de costo. |
| 6. Seguridad y pulido | P1 | Aplicar RBAC en todos los casos de uso, estados vacíos/errores, accesibilidad, revisión de datos sensibles y documentación. | Auditor sin mutaciones; analista sin cambios de cuentas ni asientos contabilizados; build y pruebas aprobadas. |
| 7. Extensiones | P2 | Exportaciones, conciliación bancaria, multimoneda y enlaces automáticos a documentos. | Especificar cada extensión y sus contratos antes de priorizar implementación. |

Las etapas 1 a 5 dependen de completar la etapa 0. El registro de un asiento solo se considera MVP terminado al completar de forma integrada las etapas de datos, autorización, contabilización y dashboard con datos reales.

## 7. Criterios de aceptación verificables

- Un asiento contabilizado debe tener al menos dos líneas y cumplir exactamente `SUM(monto_debe) = SUM(monto_haber)`; un asiento desbalanceado no cambia el estado ni deja líneas parcialmente guardadas.
- Cada línea contabilizada apunta a una cuenta existente, activa e imputable. Si informa centro de costo, este debe existir en el ERP anfitrión.
- Un fallo inducido durante la contabilización revierte encabezado, detalles y cambio de estado como una sola operación atómica.
- Un asiento contabilizado no puede actualizarse ni eliminarse por API/UI; su corrección crea una reversa balanceada enlazada y deja intacto el original.
- El creador, aprobador y las marcas de tiempo se conservan para cada cambio de estado relevante.
- El perfil Auditor no puede mutar registros; el Analista no puede alterar cuentas ni contabilizar/eliminar asientos históricos fuera de la política acordada.
- Con un conjunto de datos de prueba conocido, los totales del dashboard coinciden con las sumas de asientos contabilizados del período y excluyen borradores y rechazados.
- Las vistas principales funcionan en escritorio y móvil, y los filtros comunican resultados vacíos y errores sin ocultar fallos de autorización o persistencia.

## 8. Datos sensibles y riesgos

| Riesgo | Mitigación / decisión |
|---|---|
| Asientos desbalanceados o guardados parcialmente | Restricción de doble partida y contabilización atómica en la base relacional. |
| Manipulación o borrado del historial | Inmutabilidad después de contabilizar, reversas enlazadas, auditoría y permisos backend. |
| Mala clasificación u ocultamiento de gastos | Plan de cuentas controlado; no depender de una categoría libre como sustituto de una cuenta contable. |
| Exposición de caja o márgenes a otros módulos | Autorización por caso de uso y ámbito financiero; no retornar campos financieros a usuarios no autorizados. |
| Incompatibilidad con el ERP base | Resolver primero las claves/roles reales; no asumir que el modelo base ya incluye las tablas mencionadas en el MER. |
| Precisión monetaria o ambigüedad fiscal | `DECIMAL`, moneda explícita y confirmación del país, escala y política fiscal antes de producción. |

## 9. Estado actual y pendientes

La interfaz inicial tiene navegación, dashboard de ejemplo y filas estáticas en `index.html`, `src/main.js` y `src/styles.css`. No hay actualmente en el repositorio servicio financiero, tablas SQL, almacenamiento de transacciones, autenticación/RBAC contable, conciliación ni cálculos basados en datos reales. Por tanto, las métricas mostradas en el prototipo son ilustrativas.

**Decisiones pendientes antes de producción:** nombres y tipos reales de las claves compartidas; disponibilidad del presupuesto departamental; proveedor SQL/backend; roles heredados; país/moneda y política de períodos; umbral y reglas de aprobación; asignación obligatoria de centros de costo. Estas decisiones no bloquean la evaluación del diseño, pero sí la implementación segura y conectada.