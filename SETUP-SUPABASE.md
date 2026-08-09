# Configuración Supabase — Montes Moreno Healthcare Associates Inventory multi-clínica

Esta versión incluye dos sedes desde el inicio:

- Goliad
- San Pedro

El administrador puede tener acceso a ambas y usar una vista consolidada. El personal solo verá las clínicas asignadas.

## Paso 1
Crea un proyecto nuevo en Supabase llamado `Montes Moreno Healthcare Associates Inventory`.

## Paso 2
Abre `SQL Editor`, crea una consulta nueva, pega todo el contenido de `supabase-schema.sql` y pulsa `Run`.

El script crea:

- Una organización: Montes Moreno Healthcare Associates.
- Las dos clínicas.
- Usuarios y roles.
- Asignación de usuarios por clínica.
- Productos compartidos por organización.
- Stock, lotes, mínimos y movimientos separados por sede.
- Transferencias atómicas entre clínicas.
- Seguridad RLS para impedir que un empleado vea otra sede sin autorización.

## Paso 3
Crea tu usuario en Authentication > Users. Luego asignaremos tu perfil como `admin` y te daremos acceso a ambas clínicas con una consulta SQL breve.

## Importante
No uses todavía el prototipo local como inventario oficial. La interfaz actual demuestra el flujo multi-clínica, pero la sincronización real entre dispositivos comienza después de conectar Supabase.
