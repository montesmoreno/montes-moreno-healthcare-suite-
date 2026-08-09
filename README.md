# Montes Moreno Healthcare Associates Suite

Repositorio para el inventario multi-clínica y el reloj de empleados, conectados al proyecto Supabase `vmontzgcfsvyqiavukeq`.

## Estado de Supabase

La base fue creada directamente el 9 de agosto de 2026. Contiene:

- Organización `Montes Moreno Healthcare Associates`.
- Clínicas Goliad, San Pedro, West Texas, Odessa, Rundberg y Walzem.
- Inventario, productos, lotes, movimientos, transferencias, proveedores y auditoría.
- Perfiles, empleados y registros de Clock In/Clock Out.
- Row Level Security y funciones con acceso anónimo revocado.
- Ningún empleado precargado. El catálogo contiene los 71 productos importados de McKesson; las existencias por clínica comienzan en cero hasta que usted las registre.

## Administrador inicial

El usuario de Authentication es `clinicatexas@gmail.com`, con perfil `admin` y acceso a todas las clínicas. Debe confirmar el correo enviado por Supabase antes del primer acceso.

La contraseña no se guarda en este repositorio.

## Despliegue

Configura estas variables privadas en Vercel:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

Nunca subas la service-role key, la contraseña administrativa ni `JWT_SECRET` a GitHub.

## Estructura

- `/inventory` contiene la aplicación de inventario (la raíz también abre el inventario).
- `/time-clock` contiene el reloj de empleados y `/time-clock/admin` el panel de nómina.
- `supabase-schema.sql` contiene el esquema base del inventario.
- `time-clock-schema.sql` contiene las tablas integradas de empleados y tiempo.

Las dos aplicaciones usan el mismo proyecto Supabase y se publican juntas en un solo proyecto Vercel, compatible con el plan gratuito.
