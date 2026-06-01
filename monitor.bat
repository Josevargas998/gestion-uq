@echo off
:: Monitor de salud - reinicia servidores si se caen
:: Este script corre en segundo plano mientras el sistema está activo

:loop
timeout /t 30 /nobreak >nul

:: Verificar backend en puerto 3001
netstat -ano | find ":3001" | find "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [%time%] Backend caido - reiniciando... >> "%~dp0logs\monitor.log"
  start "GestionUQ-Backend" /min cmd /c "cd /d "%~dp0" && node backend/server.js"
)

:: Verificar frontend en puerto 5173
netstat -ano | find ":5173" | find "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [%time%] Frontend caido - reiniciando... >> "%~dp0logs\monitor.log"
  start "GestionUQ-Frontend" /min cmd /c "cd /d "%~dp0" && npm run dev"
)

goto loop
