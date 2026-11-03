# Research: Módulo de Contabilidad y Finanzas

**Feature**: `002-contabilidad-finanzas` | **Date**: 2026-11-03

## Contexto investigado

La aplicación actual es una SPA ligera construida con Vite, HTML, CSS y JavaScript vanilla. El `index.html` ya contiene el shell financiero (barra lateral, barra superior, panel con métricas estáticas y tabla de transacciones de ejemplo), pero `src/main.js` solo alterna vistas y muestra mensajes de toast. No existe todavía dominio financiero, persistencia, validación contable, flujo de aprobación ni reportes calculados. La suite de pruebas existente pertenece al módulo base anterior (Entidad/Documento) e importa archivos que ya no existen (`src/app.js`, `src/storage.js`, `src/module-config.js`), por lo que actualmente no puede ejecutarse.

## Decisión 1: Mantener Vite + JavaScript vanilla y el shell existente

**Decisión**: Conservar la pila actual (Vite 8, HTML, CSS, JavaScript ES2022) y el shell visual del ERP. La lógica financiera se organiza en módulos de dominio puro, repositorios y vistas.

**Justificación**: La especificación y la constitución priorizan una huella mínima de dependencias, mantenibilidad y consistencia visual. Introducir un framework agregaría complejidad sin resolver un problema que el tamaño del módulo no justifica.

**Alternativas consideradas**:
- React o Vue: mayor ecosistema, pero añade dependencias, estado y abstracción innecesarios para siete vistas y 500 asientos.
- Reescribir el shell: rompería la consistencia visual y el trabajo ya existente.

## Decisión 2: Importes como enteros con escala fija de cuatro decimales

**Decisión**: Representar cada importe como un entero en unidades de 1/10.000 (`1.2345` → `12345`). Cada línea tiene un lado explícito `DEBIT` o `CREDIT` y un importe positivo. Se rechaza cualquier valor con más de cuatro decimales en lugar de redondearlo.

**Justificación**: La partida doble exige igualdad exacta entre Debe y Haber. La aritmética de punto flotante produce diferencias como `0.1 + 0.2 !== 0.3`. La escala 4 cubre el requisito de precisión sin dependencias externas y mantiene los valores dentro del rango seguro de `Number`.

**Alternativas consideradas**:
- Punto flotante: rechazado por errores de redondeo inaceptables en contabilidad.
- Centavos (escala 2): rechazado porque la especificación admite cuatro decimales.
- Cadenas decimales como tipo canónico: legibles, pero propensas a coerción accidental a `Number` en cada operación.
- Bibliotecas como `decimal.js` o `big.js`: añaden dependencia y superficie de API sin beneficio para una escala fija.
- `BigInt` generalizado: seguro, pero incómodo para JSON; se reserva para una futura extensión multimoneda.

**Reglas derivadas**:
- Parsear desde texto con un analizador dedicado; nunca usar `parseFloat` para importes del usuario.
- Aceptar formato local español de forma deliberada (por ejemplo `1.234,56` → `1234.56`) y validar con una expresión que limite la parte fraccionaria a cuatro dígitos.
- Formatear desde la parte entera y el resto, usando `Intl.NumberFormat` solo para presentación.
- Rechazar importes cero, negativos o con exceso de precisión; no redondear silenciosamente.

## Decisión 3: Estado persistido en una clave raíz versionada

**Decisión**: Usar una única clave `erp:finance:state` cuyo valor contiene `schemaVersion`, `stateRevision`, `savedAt` y `data` con `accounts`, `entries`, `audit` y `settings`. Las migraciones se ejecutan al cargar, son idempotentes y escriben la forma completa actual.

**Justificación**: Una sola escritura evita estados parciales entre cuentas y asientos. La versión dentro del valor permite migrar datos existentes sin orfanarlos. La revisión permite detectar escrituras obsoletas entre pestañas.

**Alternativas consideradas**:
- Varias claves por colección: puede dejar referencias inconsistentes tras una escritura parcial.
- Claves versionadas (`state:v2`): los datos antiguos quedan huérfanos y la migración se complica.
- IndexedDB: su asincronía no se justifica para 500 asientos; se reconsiderará si se añaden adjuntos o volúmenes mayores.

**Reglas derivadas**:
- Validar la forma al cargar; si el JSON está corrupto, aislar el valor original y arrancar con advertencia.
- Si `schemaVersion` es mayor que la soportada, no sobrescribir; entrar en modo de solo lectura/exportación.
- Tratar `QuotaExceededError` y errores de modo privado de forma explícita; no simular éxito si la persistencia falla.
- No almacenar credenciales, tokens ni secretos.

## Decisión 4: Máquina de estados explícita para asientos

**Decisión**: Implementar los estados `Borrador`, `Pendiente`, `Aprobada`, `Contabilizada` y `Revertida` con una tabla de transiciones permitidas. Las transiciones no listadas se rechazan con un error tipado.

| Desde | Hacia | Acción | Guarda |
|---|---|---|---|
| Borrador | Pendiente | Enviar a revisión | Asiento válido; registra remitente y fecha |
| Pendiente | Borrador | Devolver/rechazar | Registra motivo y actor |
| Pendiente | Aprobada | Aprobar | Permiso `finance.entry.approve`; registra aprobador y fecha |
| Aprobada | Contabilizada | Contabilizar | Permiso `finance.entry.post`; registra contabilizador y fecha |
| Contabilizada | Revertida | Revertir | Permiso `finance.entry.reverse`; solo mediante comando de reversa |

**Justificación**: La especificación exige impedir saltos de estado y preservar la segregación de funciones. Una tabla explícita hace que las reglas sean comprobables y evita condiciones dispersas en la interfaz.

**Alternativas consideradas**:
- Estado libre por cadena: no permite validar transiciones ni auditar correctamente.
- Máquina de estados genérica configurable: sobredimensionada para cinco estados y un flujo fijo.

**Reglas derivadas**:
- Congelar la edición de líneas e importes en cuanto el asiento deja de ser `Borrador`.
- Un asiento `Contabilizada` o `Revertida` nunca se edita ni se elimina.
- Cada transición añade un evento de auditoría con acción, estado anterior, estado nuevo, actor, fecha ISO y motivo cuando aplique.

## Decisión 5: Reversas enlazadas y membresía contable de reportes

**Decisión**: Una reversa crea un asiento nuevo que copia las líneas del original con los lados invertidos y referencias en ambos sentidos (`reversalOfEntryId` y `reversedByEntryId`). Solo se permite una reversa directa por asiento y solo sobre asientos `Contabilizada`. Los reportes incluyen asientos con `postedAt` no nulo, es decir, tanto `Contabilizada` como `Revertida`.

**Justificación**: Si los reportes incluyeran solo `Contabilizada`, al revertir un asiento el original quedaría excluido y la reversa incluida, produciendo un efecto neto incorrecto. Incluir ambos lados del par permite que la reversa nete a cero y mantiene la trazabilidad.

**Alternativas consideradas**:
- Borrar o editar el asiento original: viola la inmutabilidad y la auditoría.
- Permitir múltiples reversas: dificulta la conciliación y la trazabilidad.
- Excluir asientos revertidos de los reportes: distorsiona los totales históricos.

## Decisión 6: Jerarquía de cuentas con `parentId` y detección de ciclos

**Decisión**: Guardar `parentId` como relación autoritativa y derivar los hijos al leer. Al crear o editar una cuenta, rechazar autorreferencias, padres inexistentes o inactivos y ciclos, recorriendo la cadena de ancestros con un conjunto de visitados.

**Justificación**: La jerarquía es necesaria para agrupar cuentas y calcular saldos consolidados. Un recorrido de ancestros es simple y suficiente para el volumen esperado.

**Alternativas consideradas**:
- Almacenar listas de hijos: introduce duplicación y riesgo de desincronización.
- Limitar la profundidad sin detectar ciclos: no impide todas las referencias circulares.

**Reglas derivadas**:
- `acceptsEntries` es independiente de `active`; las cuentas de agrupación normalmente no aceptan movimientos.
- El código de cuenta es texto único; no se interpreta como número.
- Solo se elimina una cuenta sin hijos y sin movimientos; en caso contrario se desactiva.
- Los saldos se derivan de las líneas contabilizadas, nunca de un saldo acumulado almacenado.

## Decisión 7: Adaptador de identidad y permisos reemplazable

**Decisión**: Definir un adaptador con `getSession()` y `can(permission)` que devuelva el usuario actual y sus permisos. El dominio comprueba permisos explícitos (`finance.account.manage`, `finance.entry.create`, `finance.entry.submit`, `finance.entry.approve`, `finance.entry.post`, `finance.entry.reverse`, `finance.report.view`), no nombres de rol. Los catálogos de usuarios y departamentos se exponen como datos de solo lectura.

**Justificación**: La especificación exige que los permisos provengan del ERP y que no se dupliquen usuarios ni departamentos. Un adaptador permite usar datos locales de demostración ahora y sustituirlos por la implementación real del ERP sin cambiar el dominio.

**Alternativas consideradas**:
- Comprobar roles directamente en las vistas: frágil y difícil de sustituir.
- Ocultar botones como única protección: insuficiente; el comando debe denegar la acción aunque se invoque directamente.
- Crear un catálogo financiero propio de usuarios: viola la integración con el ERP.

**Limitación documentada**: En una aplicación solo de navegador, los permisos son controles de experiencia, no seguridad real; cualquier usuario puede editar el almacenamiento local. La autorización definitiva debe aplicarse en el ERP/backend cuando exista.

## Decisión 8: Arquitectura de interfaz y enrutamiento

**Decisión**: Mantener `index.html` como shell único. `src/app.js` exporta `initApp()` para permitir pruebas en jsdom. `src/router.js` resuelve los valores existentes de `data-view` a vistas dedicadas y actualiza `aria-current`. Cada vista renderiza su contenido en un contenedor propio dentro de `.page-wrap`, reutilizando los tokens y clases existentes.

**Justificación**: El shell actual ya es accesible y consistente. Exportar un inicializador testeable corrige el problema de `src/main.js`, que ejecuta consultas DOM al importarse y no puede probarse de forma aislada.

**Alternativas consideradas**:
- Una página HTML por vista: rompe la experiencia de SPA y duplica el shell.
- Renderizado completo desde JavaScript: innecesario; el shell estático existente puede conservarse y las vistas rellenar sus contenedores.

## Decisión 9: Estrategia de pruebas

**Decisión**: Probar el dominio puro en Node con Vitest e inyectar reloj, generador de IDs, almacenamiento e identidad. Usar jsdom solo para integración de vistas, formularios, persistencia y flujos completos.

**Justificación**: Las reglas contables deben probarse sin DOM para obtener pruebas rápidas y deterministas. Las pruebas de integración cubren la conexión entre formularios, dominio y almacenamiento.

**Casos clave**:
- Dinero: análisis local, formato, límite de cuatro decimales, rechazo de cero/negativos.
- Asientos: desbalance, menos de dos líneas, ambos lados en una línea, cuentas inactivas o no imputables.
- Cuentas: código duplicado/vacío, autorreferencia, ciclos, padre inactivo, eliminación con movimientos.
- Ciclo de vida: todas las transiciones permitidas y rechazadas, permisos denegados.
- Reversas: espejo de líneas, enlace bidireccional, segunda reversa rechazada, reporte neto cero.
- Filtros: límites de fecha inclusivos, combinación de criterios, estado vacío, texto libre.
- Persistencia: migración idempotente, JSON corrupto, versión futura, cuota excedida.
- Concurrencia: revisión obsoleta al aprobar o contabilizar.

**Alternativas consideradas**:
- Probar todo a través de jsdom: más lento y propenso a fallos por detalles de presentación.
- Depender de aserciones de tiempo real para rendimiento: flaky en CI; se mide por separado.

## Decisión 10: Reconciliación del repositorio y artefactos obsoletos

**Decisión**: La especificación `002` es la autoridad. La suite de pruebas del módulo base anterior se reemplazará por la suite financiera, y `README.md` y el nombre del paquete se actualizarán para describir el módulo actual. No se recreará el módulo Entidad/Documento solo para satisfacer pruebas obsoletas.

**Justificación**: El repositorio está en transición: el `index.html` ya es financiero, pero README y pruebas siguen describiendo el módulo base. Mantener pruebas que importan archivos inexistentes impide que `npm test` sea una señal confiable y contradice la constitución de verificación.

**Alternativas consideradas**:
- Restaurar el módulo base junto al financiero: duplica alcance y compite por la misma navegación.
- Dejar las pruebas obsoletas en cuarentena: mantiene ruido y deuda técnica; se prefiere reemplazarlas y documentar el cambio.

## Decisión 11: Integración con usuarios y departamentos del ERP

**Decisión**: Tratar las claves de usuario y departamento como cadenas opacas proporcionadas por el adaptador. Validar que existan al guardar, enviar, aprobar, contabilizar y revertir. No almacenar credenciales ni duplicar los catálogos. Si no existe un catálogo real, usar datos de demostración de solo lectura claramente identificados.

**Justificación**: El repositorio actual no contiene tablas de usuarios ni departamentos, y la especificación prohíbe duplicarlas. Un adaptador con datos de demostración permite avanzar sin inventar un contrato de backend.

**Alternativas consideradas**:
- Crear un catálogo financiero de usuarios: viola la especificación y genera duplicación.
- Asumir claves numéricas específicas: el modelo base no documenta esos tipos; las cadenas opacas son más seguras.

## Decisión 12: Consultas, filtros y reportes derivados

**Decisión**: Calcular métricas y filtros mediante selectores puros sobre el estado persistido. Usar `accountingDate` (fecha contable, sin hora) para los períodos y un indicador explícito `isCashEquivalent` en las cuentas para el flujo de caja. No almacenar saldos acumulados.

**Justificación**: Derivar los totales evita desincronización y facilita la auditoría. La fecha contable evita errores de zona horaria. El indicador explícito de efectivo evita inferir comportamiento a partir de códigos o nombres de cuenta.

**Alternativas consideradas**:
- Guardar saldos por cuenta: se desincroniza con el historial y complica las reversas.
- Usar `createdAt` para los períodos: mezcla la fecha de captura con la fecha contable.
- Deducir efectivo por el código de cuenta: frágil ante planes de cuentas personalizados.
