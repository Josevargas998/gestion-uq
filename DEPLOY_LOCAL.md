# Guía de Instalación Local — Gestión UQ

> Base de datos en tu PC · Acceso por red LAN · Backups automáticos viernes 3 PM

---

## ¿Qué necesitas instalar?

1. **PostgreSQL 17** — la base de datos local
2. **Node.js** — para correr el servidor (ya lo tienes)
3. **El proyecto** — ya está en tu PC

---

## PASO 1 — Instalar PostgreSQL 17

1. Descarga el instalador desde: https://www.postgresql.org/download/windows/
2. Ejecuta el instalador. Cuando pida contraseña del superusuario `postgres`, usa cualquiera que recuerdes.
3. En "componentes a instalar" deja todo marcado (PostgreSQL Server, pgAdmin, Stack Builder, Command Line Tools).
4. Puerto: **5432** (el predeterminado, no cambies nada).
5. Termina la instalación. Cuando pregunte si abrir Stack Builder, haz clic en **Cancelar**.

---

## PASO 2 — Crear la base de datos

1. Abre **pgAdmin 4** (se instaló con PostgreSQL) o **SQL Shell (psql)**.
2. Conéctate al servidor local con usuario `postgres`.
3. Ejecuta el script de configuración:

### Desde pgAdmin:
- Menú: **Tools → Query Tool**
- Abre el archivo: `supabase/local_postgresql_setup.sql`
- Haz clic en ▶ (Ejecutar)

### Desde SQL Shell (psql):
```
psql -U postgres
\i 'C:/ruta/a/gestion-uq/supabase/local_postgresql_setup.sql'
```

✅ Deberías ver: `Setup de base de datos completado correctamente.`

---

## PASO 3 — Migrar datos desde Supabase

> Este paso trae todos tus datos actuales (solicitudes, docentes, usuarios) a tu PC.

```bash
# Desde la carpeta del proyecto:
cd backend
npm install         # instala pg y demás dependencias
node scripts/migrate_from_supabase.js
```

Verás algo así:
```
🚀 Migración Supabase → PostgreSQL local
   Origen:  https://viqtctlkvzrhohikwbop.supabase.co
   Destino: localhost/gestion_uq_db

📋 Migrando usuarios...
  usuarios: 5 filas ✓
📋 Migrando solicitudes...
  solicitudes: 2128 filas ✓
📋 Migrando docentes...
  docentes: 187 filas ✓

✅ Migración completada.
```

---

## PASO 4 — Compilar el frontend

```bash
# Desde la raíz del proyecto (donde está package.json):
npm run build
```

Esto crea la carpeta `dist/` que el servidor Express sirve automáticamente.

---

## PASO 5 — Iniciar el servidor

```bash
cd backend
node server.js
```

Verás:
```
🚀 Servidor gestion-uq iniciado
   Tu PC    → http://localhost:3001
   Red LAN  → http://192.168.1.10:3001  ← comparte esta URL
   Estado   → http://localhost:3001/api/health
```

**La URL de la red LAN** (192.168.x.x) es la que debes compartir con tus compañeras.

---

## PASO 6 — Abrir el puerto en el firewall de Windows

Para que tus compañeras puedan conectarse, debes abrir el puerto 3001:

1. Busca "Firewall de Windows Defender" en el menú inicio
2. Haz clic en "Configuración avanzada"
3. "Reglas de entrada" → "Nueva regla"
4. Tipo: **Puerto** → TCP → Puerto específico: **3001**
5. Acción: **Permitir la conexión**
6. Aplica a: marcar las tres opciones (Dominio, Privado, Público)
7. Nombre: `Gestion-UQ`

---

## PASO 7 — Configurar backups automáticos

> Los backups se guardan en `D:\Backups\gestion-uq\` cada viernes a las 3 PM.

1. Clic derecho sobre `backend/scripts/setup_backup_task.ps1`
2. Selecciona **"Ejecutar con PowerShell" como Administrador**
3. Verás: `✅ Tarea 'GestionUQ-Backup-Viernes' registrada exitosamente.`

Para hacer un backup manual ahora mismo:
```powershell
Start-ScheduledTask -TaskName 'GestionUQ-Backup-Viernes'
```

O ejecutar directamente el script:
```powershell
powershell -ExecutionPolicy Bypass -File backend/scripts/backup.ps1
```

---

## Cómo arrancar el sistema cada mañana

Solo necesitas ejecutar **un comando** en la carpeta del proyecto:

```bash
cd backend
node server.js
```

> 💡 **Tip**: Crea un acceso directo en el escritorio que ejecute este comando. O configura el servidor para que inicie automáticamente con Windows usando `pm2` o una tarea programada.

---

## Compartir con compañeras

1. Descubre tu IP local ejecutando en PowerShell:
   ```powershell
   ipconfig
   ```
   Busca la línea "Dirección IPv4" (ej: `192.168.1.10`)

2. Comparte la URL: `http://192.168.1.10:3001`

3. Tus compañeras abren esa URL en su navegador — eso es todo.

> **Importante**: Tu PC debe estar encendida para que ellas puedan conectarse.

---

## Restaurar un backup

Si necesitas recuperar datos de un backup:

```bash
# En SQL Shell (psql):
psql -U postgres -d gestion_uq_db -f "D:\Backups\gestion-uq\backup_2026-05-23_15-00.sql"
```

---

## Preguntas frecuentes

**¿Qué pasa si apago el PC?**
Las compañeras no pueden conectarse. El sistema solo funciona cuando tu PC está encendida.

**¿Se puede acceder desde fuera de la oficina?**
No, por defecto solo desde la red local. Para acceso externo necesitas configurar el router (port forwarding) — consulta con el área de sistemas.

**¿Los datos siguen en Supabase?**
Sí, hasta que decidas eliminarlos. El sistema ya no los usa pero siguen ahí como respaldo.

**¿Puedo volver a Supabase si algo falla?**
Sí. Los archivos originales están en el repositorio en la rama principal.
