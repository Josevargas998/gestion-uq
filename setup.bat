@echo off
:: =====================================================================
:: SETUP.BAT — Instalador y Arrancador Automatizado para Gestión UQ
:: Oficina de Asuntos Profesorales — Universidad del Quindío
:: =====================================================================
chcp 65001 > nul
setlocal enabledelayedexpansion

title Gestión UQ — Instalador Automático

echo =====================================================================
echo    🚀 INICIANDO INSTALACIÓN AUTOMÁTICA DE GESTIÓN UQ 🚀
echo =====================================================================
echo.

:: 1. Verificar si Node.js está instalado
echo [1/5] 🔍 Verificando entorno de software...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Node.js no está instalado en este sistema.
    echo    Por favor, descarga e instala Node.js LTS desde: https://nodejs.org/
    echo    Luego, vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo    ✓ Node.js detectado (%NODE_VERSION%^)

:: 2. Configurar archivos de entorno (.env) si no existen
echo.
echo [2/5] 📋 Configurando archivos de entorno (.env)...
if not exist .env (
    if exist .env.example (
        copy .env.example .env > nul
        echo    ✓ Archivo .env copiado desde plantilla .env.example.
    ) else (
        echo VITE_API_URL=http://localhost:3001 > .env
        echo VITE_API_SECRET=gestion_uq_api_secret_2026_muy_largo >> .env
        echo    ✓ Archivo .env creado con valores predeterminados.
    )
) else (
    echo    ✓ Archivo .env ya existe.
)

if not exist backend\.env (
    if exist backend\.env.example (
        copy backend\.env.example backend\.env > nul
        echo    ✓ Archivo backend/.env copiado desde plantilla.
    ) else (
        echo DB_HOST=localhost > backend\.env
        echo DB_PORT=5432 >> backend\.env
        echo DB_NAME=gestion_uq_db >> backend\.env
        echo DB_USER=gestion_uq >> backend\.env
        echo DB_PASSWORD=gestion_uq_2026 >> backend\.env
        echo PORT=3001 >> backend\.env
        echo NODE_ENV=production >> backend\.env
        echo API_SECRET=gestion_uq_api_secret_2026_muy_largo_cambiar_esto >> backend\.env
        echo BACKUP_PATH=D:\Backups\gestion-uq >> backend\.env
        echo PG_DUMP_PATH=C:\Program Files\PostgreSQL\17\bin\pg_dump.exe >> backend\.env
        echo    ✓ Archivo backend/.env creado con valores predeterminados.
    )
) else (
    echo    ✓ Archivo backend/.env ya existe.
)

:: 3. Instalar dependencias del frontend (raíz)
echo.
echo [3/5] 📦 Instalando dependencias de la interfaz (Frontend)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Hubo un fallo instalando las dependencias del Frontend.
    echo    Verifique su conexión a internet y vuelva a intentarlo.
    echo.
    pause
    exit /b 1
)
echo    ✓ Frontend listo.

:: 4. Compilar React Frontend
echo.
echo [4/5] 🏗️ Compilando código fuente de React...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Fallo al compilar la interfaz SPA (Vite build^).
    echo.
    pause
    exit /b 1
)
echo    ✓ Compilación completada con éxito (carpeta dist/ generada^).

:: 5. Instalar dependencias del backend
echo.
echo [5/5] ⚙️ Configurando el servidor central (Backend)...
cd backend
call npm install
:: Asegurarnos de que express-rate-limit esté instalado explícitamente para producción
echo 📦 Asegurando dependencias de producción críticas (Rate limiting)...
call npm install express-rate-limit --save
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Fallo al instalar las dependencias del servidor.
    echo.
    pause
    cd ..
    exit /b 1
)
echo    ✓ Servidor y base de datos configurados.
cd ..

echo.
echo =====================================================================
echo    🎉 ¡INSTALACIÓN COMPLETADA EXITOSAMENTE EN RECORD TIME! 🎉
echo =====================================================================
echo.
echo    Para levantar el sistema de inmediato, elija una opción:
echo    [1] Arrancar el sistema en modo seguro (HTTP o HTTPS) ahora.
echo    [2] Salir y arrancar después ejecutando "npm start" desde backend.
echo.

set /p OPT="Seleccione una opción (1 o 2): "
if "%OPT%"=="1" (
    echo.
    echo 🚀 Iniciando Servidor Express...
    cd backend
    node server.js
) else (
    echo.
    echo 👍 Setup finalizado. Puedes arrancar el servidor ejecutando:
    echo    cd backend ^&^& node server.js
    echo.
)

endlocal
pause
