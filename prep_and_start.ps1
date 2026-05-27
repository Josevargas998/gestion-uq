$ErrorActionPreference = "Stop"

# Add Node to PATH
$env:PATH += ";C:\Program Files\nodejs"

Write-Host "Preparando archivos de entorno (.env)..."
Copy-Item ".env.example" -Destination ".env.local" -Force
Copy-Item ".env.example" -Destination "backend\.env" -Force

Write-Host "Instalando dependencias del backend..."
Set-Location backend
npm install
Set-Location ..

Write-Host "Iniciando servidor Backend..."
# Usamos Start-Process para abrir una nueva ventana visible para el usuario
Start-Process powershell -ArgumentList "-NoExit -Command `" `$env:PATH += ';C:\Program Files\nodejs'; cd backend; npm run dev `""

Write-Host "Iniciando servidor Frontend (Vite)..."
Start-Process powershell -ArgumentList "-NoExit -Command `" `$env:PATH += ';C:\Program Files\nodejs'; npm run dev `""

Write-Host "¡Servidores iniciados en nuevas ventanas!"
