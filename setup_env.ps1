$ErrorActionPreference = "Stop"

# 1. Setup Node path and install dependencies
Write-Host "Setting up Node path..."
$env:PATH += ";C:\Program Files\nodejs"
Write-Host "Running npm install..."
npm install

# 2. Setup PostgreSQL path and restore DB
Write-Host "Finding psql.exe..."
$psqlPath = (Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName

if (-not $psqlPath) {
    Write-Error "Could not find psql.exe"
}

Write-Host "psql found at $psqlPath"
$env:PGPASSWORD="heriberto"

Write-Host "Creating database gestion_uq..."
# We ignore errors here in case it already exists
& $psqlPath -U postgres -c "CREATE DATABASE gestion_uq;" 2>$null

Write-Host "Restoring database..."
& $psqlPath -U postgres -d gestion_uq -f "C:\Users\jhvar\.gemini\antigravity\scratch\gestion-uq\GestionUq\backup_gestion_uq_2026_05_25.sql"

Write-Host "Setup completed successfully."
