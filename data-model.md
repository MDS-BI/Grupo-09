# Modelo Entidad-Relación (MER) - Contabilidad y Finanzas

El siguiente modelo ilustra la estructura central financiera. Nótese la integración con la estructura base del ERP (`Usuario_Base` y `Departamento_Base` funcionando como centros de costo). Se usa una lógica de "Transacción" y "Detalle_Transaccion" para permitir asientos contables complejos.

```mermaid
erDiagram
    Usuario_Base ||--o{ Transaccion : "registra (auditoría)"
    Departamento_Base ||--o{ Detalle_Transaccion : "imputado_a (centro costo)"
    Transaccion ||--|{ Detalle_Transaccion : "contiene"
    Cuenta_Contable ||--o{ Detalle_Transaccion : "categoriza"

    Usuario_Base {
        int id_usuario PK
        string email
        string password_hash
        string rol "CFO, Analista, Auditor"
    }

    Departamento_Base {
        int id_departamento PK
        string nombre_area
        float presupuesto_asignado
    }

    Cuenta_Contable {
        int id_cuenta PK
        string codigo_cuenta "Ej: 1.1.1"
        string nombre_cuenta "Ej: Caja, Proveedores"
        string tipo "Activo, Pasivo, Patrimonio, Ingreso, Egreso"
    }

    Transaccion {
        int id_transaccion PK
        int id_usuario_creador FK
        date fecha_emision
        string tipo_documento "Factura, Boleta, Comprobante"
        string numero_documento
        string glosa_descripcion
        timestamp creado_en
    }

    Detalle_Transaccion {
        int id_detalle PK
        int id_transaccion FK
        int id_cuenta FK
        int id_departamento FK "Opcional"
        float monto_debe
        float monto_haber
    }