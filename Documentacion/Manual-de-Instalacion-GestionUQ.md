# Manual de Instalación
# Sistema de Gestión de Productividad Académica — Universidad del Quindío

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Oficina:** Asuntos Profesorales — Universidad del Quindío

---

## Introducción

El **Sistema de Gestión de Productividad Académica** (Gestión UQ) es una aplicación web que funciona completamente en la red local de la oficina. Para que el sistema funcione correctamente se requiere instalar tres componentes en el equipo servidor:

1. **Node.js** — entorno de ejecución del servidor
2. **PostgreSQL 18** — base de datos
3. **El código del sistema** — descargado desde GitHub

Una vez instalado en el equipo servidor, los demás computadores de la oficina pueden acceder al sistema desde cualquier navegador web sin necesidad de instalar nada adicional.

---

## Requisitos del Equipo Servidor

| Componente | Mínimo recomendado |
|------------|-------------------|
| Sistema Operativo | Windows 10 / Windows 11 (64 bits) |
| Procesador | Intel Core i5 o equivalente |
| Memoria RAM | 8 GB |
| Disco duro | 50 GB libres |
| Red | Conectado a la red LAN de la universidad |
| Navegador | Google Chrome o Microsoft Edge (versión reciente) |

---

## PASO 1 — Instalar Node.js

Node.js es el programa que permite ejecutar el servidor de la aplicación.

1. Abrir el navegador e ingresar a: **https://nodejs.org**
2. Descargar la versión **LTS** (Long Term Support) — es la que dice "Recomendado para la mayoría de usuarios"
3. Ejecutar el instalador descargado (`node-vXX.X.X-x64.msi`)
4. Seguir los pasos del asistente de instalación dejando todas las opciones por defecto
5. Al terminar, verificar la instalación: abrir una terminal (tecla Windows + R, escribir `cmd`, Enter) y ejecutar:
   ```
   node --version
   ```
   Debe aparecer un número de versión como `v20.x.x`

---

## PASO 2 — Instalar PostgreSQL 18

PostgreSQL es el motor de base de datos donde se guardan todos los datos del sistema.

1. Ingresar a: **https://www.postgresql.org/download/windows/**
2. Descargar el instalador de la versión **18**
3. Ejecutar el instalador como administrador
4. Durante la instalación configurar:
   - **Directorio de instalación:** dejar por defecto (`C:\Program Files\PostgreSQL\18`)
   - **Contraseña del superusuario (postgres):** anotar esta contraseña, se necesitará después
   - **Puerto:** `5432` (dejar por defecto)
   - **Locale:** `Spanish, Colombia`
5. Finalizar la instalación

### Crear la base de datos del sistema

Una vez instalado PostgreSQL, se debe crear la base de datos:

1. Abrir **pgAdmin 4** (se instala junto con PostgreSQL)
2. Conectarse al servidor local con la contraseña del paso anterior
3. Clic derecho en **"Databases"** → **"Create"** → **"Database"**
4. En el campo **Name** escribir: `gestion_uq_db`
5. Clic en **"Save"**

### Crear el usuario de la aplicación

En pgAdmin, abrir la herramienta de consultas (Query Tool) y ejecutar:

```sql
CREATE USER gestion_uq WITH PASSWORD 'gestion_uq_2026';
GRANT ALL PRIVILEGES ON DATABASE gestion_uq_db TO gestion_uq;
```

---

## PASO 3 — Descargar el código del sistema

1. Ingresar a: **https://github.com/Josevargas998/gestion-uq**
2. Clic en el botón verde **"Code"** → **"Download ZIP"**
3. Descomprimir el archivo ZIP descargado en una ubicación conveniente, por ejemplo:
   ```
   C:\gestion-uq\
   ```
   > **Importante:** La ruta no debe tener espacios ni caracteres especiales.

4. Abrir una terminal en esa carpeta (clic derecho dentro de la carpeta → "Abrir en Terminal")
5. Ejecutar el siguiente comando para instalar las dependencias:
   ```
   npm install
   ```
   Este proceso puede tardar varios minutos la primera vez.

---

## PASO 4 — Configurar las variables de entorno

### Variables del Backend

1. Dentro de la carpeta `gestion-uq\backend\`, crear un archivo llamado `.env`
2. Escribir el siguiente contenido:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestion_uq_db
DB_USER=gestion_uq
DB_PASSWORD=gestion_uq_2026
API_SECRET=gestion_uq_api_secret_2026_muy_largo
PORT=3001
NODE_ENV=production
```

### Variables del Frontend

1. En la raíz de la carpeta `gestion-uq\`, crear un archivo llamado `.env.local`
2. Escribir el siguiente contenido:

```
VITE_API_URL=http://localhost:3001
VITE_API_SECRET=gestion_uq_api_secret_2026_muy_largo
```

---

## PASO 5 — Importar los datos iniciales

Si se cuenta con datos exportados de la versión anterior del sistema (archivos CSV de docentes y solicitudes), ejecutar los scripts de importación:

```
node scripts/import/upload_productividad.cjs
node scripts/import/upload_ascensos.cjs
```

Si es una instalación nueva, los datos se ingresarán directamente desde la interfaz del sistema.

---

## PASO 6 — Verificar que el sistema funciona

1. Hacer **doble clic** en el archivo `Iniciar Silencioso.vbs` (o `Iniciar Gestion UQ.bat` para ver el log)
2. Esperar aproximadamente 8 segundos
3. El navegador se abrirá automáticamente con la pantalla de inicio de sesión
4. Ingresar con la cédula del administrador: `1094970478`

Si el sistema no abre automáticamente, ingresar manualmente al navegador:
```
http://localhost:5173
```

---

## Acceso desde otros equipos de la oficina

Una vez el sistema está corriendo en el equipo servidor, los demás computadores de la oficina pueden acceder desde su navegador escribiendo:

```
http://[IP-DEL-SERVIDOR]:5173
```

La dirección IP del servidor se puede consultar abriendo una terminal en el servidor y ejecutando:
```
ipconfig
```
Buscar la línea que dice **"Dirección IPv4"** bajo el adaptador de red activo.

---

## Inicio automático con Windows

Para que el sistema inicie automáticamente cuando el equipo encienda:

1. El archivo `Iniciar Silencioso.vbs` ya está configurado como programa de inicio de Windows
2. Adicionalmente, solicitar al área de Sistemas TI de la universidad activar en el BIOS la opción **"Restore on AC Power Loss"** para que el equipo encienda solo después de un corte de energía

---

## Resolución de problemas comunes

| Problema | Posible causa | Solución |
|----------|--------------|---------|
| No abre el navegador | Los servidores no iniciaron | Esperar 15 seg o ejecutar `Iniciar Gestion UQ.bat` para ver el error |
| Error "No se puede conectar" | PostgreSQL no está corriendo | Ir a Servicios de Windows y verificar que `postgresql-x64-18` esté iniciado |
| Pantalla en blanco | Error en el frontend | Abrir la consola del navegador (F12) y revisar errores en rojo |
| Compañeras no pueden entrar | Puerto bloqueado por firewall | Solicitar al área de TI abrir el puerto 5173 en el firewall de Windows |
