@echo off
title Gestion UQ — Iniciando...
color 0A
cls

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          GESTION UQ — Universidad del Quindio        ║
echo  ║          Sistema CIARP / CEI - Productividad         ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Iniciando servidores...
echo.

:: Ir al directorio del proyecto
cd /d "%~dp0"

:: Verificar si PostgreSQL está corriendo
echo  [1/3] Verificando base de datos PostgreSQL...
sc query postgresql-x64-18 | find "RUNNING" >nul 2>&1
if errorlevel 1 (
  echo  [!] PostgreSQL no está activo. Intentando iniciar...
  net start postgresql-x64-18 >nul 2>&1
  timeout /t 3 /nobreak >nul
) else (
  echo  [OK] PostgreSQL activo.
)

:: Verificar si el backend ya está corriendo en el puerto 3001
echo  [2/3] Iniciando servidor Backend (puerto 3001)...
netstat -ano | find ":3001" | find "LISTENING" >nul 2>&1
if errorlevel 1 (
  start "GestionUQ-Backend" /min cmd /c "cd /d "%~dp0" && node backend/server.js"
  echo  [OK] Backend iniciado.
) else (
  echo  [OK] Backend ya estaba corriendo.
)

:: Verificar si el frontend ya está corriendo en el puerto 5173
echo  [3/3] Iniciando servidor Frontend (puerto 5173)...
netstat -ano | find ":5173" | find "LISTENING" >nul 2>&1
if errorlevel 1 (
  start "GestionUQ-Frontend" /min cmd /c "cd /d "%~dp0" && npm run dev"
  echo  [OK] Frontend iniciado.
) else (
  echo  [OK] Frontend ya estaba corriendo.
)

:: Esperar a que el frontend esté listo
echo.
echo  Esperando que los servidores estén listos...
timeout /t 5 /nobreak >nul

:: Abrir el navegador
echo  Abriendo Gestion UQ en el navegador...
start "" "http://localhost:5173"

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   ✓ Gestion UQ está funcionando                     ║
echo  ║   → http://localhost:5173                           ║
echo  ║                                                      ║
echo  ║   Mantenga esta ventana abierta mientras usa        ║
echo  ║   el sistema. Ciérrela para detener todo.           ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

echo  Presione cualquier tecla para DETENER todos los servidores.
pause >nul

:: Al presionar tecla, detener todo
echo.
echo  Deteniendo servidores...
taskkill /FI "WINDOWTITLE eq GestionUQ-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq GestionUQ-Frontend*" /F >nul 2>&1

:: Liberar los puertos
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3001" ^| find "LISTENING"') do taskkill /pid %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| find ":5173" ^| find "LISTENING"') do taskkill /pid %%a /F >nul 2>&1

echo  Servidores detenidos. Hasta luego.
timeout /t 2 /nobreak >nul
