# Tareas de Desarrollo: Módulo de Contabilidad y Finanzas

A continuación, se detallan las tareas técnicas de frontend (UI/UX) vinculadas a las Historias de Usuario del archivo spec.md.

## Tareas para US-01 (Dashboard Financiero)
* *[Tarea 1.1]* Construir la interfaz principal (index.html) con una cuadrícula (grid) que contenga 4 tarjetas de métricas estáticas: Ingresos Totales, Gastos Totales, Resultado Neto y Saldo Disponible.
* *[Tarea 1.2]* Implementar un gráfico de barras visual en la sección central usando CSS/JS básico que represente el "Flujo de caja" de los últimos 6 meses (datos mockeados o de prueba).

## Tareas para US-02 (Registro de Transacciones)
* *[Tarea 2.1]* Crear un botón principal de "Nueva transacción" en el dashboard que abra un Modal (ventana emergente).
* *[Tarea 2.2]* Diseñar el formulario dentro del Modal con dos secciones: un encabezado (Fecha, Tipo de documento, Glosa) y una tabla dinámica para el detalle contable.
* *[Tarea 2.3]* Añadir lógica en main.js para que la tabla de detalle tenga columnas de "Cuenta", "Monto Debe" y "Monto Haber". Incluir una validación visual que muestre una alerta si la suma del Debe no es igual a la suma del Haber.

## Tareas para US-03 (Plan de Cuentas)
* *[Tarea 3.1]* Crear una vista lateral o menú de navegación que permita cambiar a la sección "Plan de Cuentas".
* *[Tarea 3.2]* Diseñar una tabla de datos (Data Grid) que liste cuentas contables de ejemplo, mostrando columnas de ID de cuenta, Código (Ej: 1.1.1), Nombre de Cuenta y Tipo.

## Tareas para US-04 (Auditoría y Trazabilidad)
* *[Tarea 4.1]* Construir una tabla en la parte inferior del dashboard llamada "Transacciones Recientes".
* *[Tarea 4.2]* Asegurar que las columnas de esta tabla muestren: Descripción, Cuenta, Centro de Costo (Departamento) y el Usuario Autor (vinculado a la base del ERP), para reflejar el modelo de datos.
