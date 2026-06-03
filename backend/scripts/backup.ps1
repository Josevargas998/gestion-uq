# backup.ps1 — Copia de seguridad automática de la BD gestion-uq
# Ejecutado por Windows Task Scheduler cada viernes a las 3:00 PM
# Guarda el backup en D:\Backups\gestion-uq\

$ErrorActionPreference = "Stop"

# ── Configuración ────────────────────────────────────────────────────────────
$DB_NAME = "gestion_uq_db"
$DB_USER = "gestion_uq"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_PASS = "gestion_uq_2026"   # Cambiar si cambiaste la contraseña

# Disco duro externo D:\
$BACKUP_DIR = "D:\Backups\gestion-uq"

# Buscar pg_dump automáticamente
$PG_DUMP = $null
$rutas = @(
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
)
foreach ($ruta in $rutas) {
    if (Test-Path $ruta) { $PG_DUMP = $ruta; break }
}
if (-not $PG_DUMP) {
    $found = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($found) { $PG_DUMP = $found.Source }
}
if (-not $PG_DUMP) {
    Write-Error "No se encontró pg_dump. Asegúrate de que PostgreSQL está instalado."
    exit 1
}

# ── Crear carpeta de backups si no existe ────────────────────────────────────
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Write-Host "Carpeta creada: $BACKUP_DIR"
}

# ── Nombre del archivo con fecha ─────────────────────────────────────────────
$Fecha    = Get-Date -Format "yyyy-MM-dd_HH-mm"
$FileName = "backup_$Fecha.sql"
$FilePath = Join-Path $BACKUP_DIR $FileName

# ── Ejecutar pg_dump ─────────────────────────────────────────────────────────
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Iniciando backup de '$DB_NAME'..."

$env:PGPASSWORD = $DB_PASS

& $PG_DUMP `
    --host=$DB_HOST `
    --port=$DB_PORT `
    --username=$DB_USER `
    --format=plain `
    --encoding=UTF8 `
    --file="$FilePath" `
    $DB_NAME

if ($LASTEXITCODE -eq 0) {
    $SizeKB = [math]::Round((Get-Item $FilePath).Length / 1KB, 1)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✅ Backup guardado: $FileName ($SizeKB KB)"

    # Mantener solo los últimos 12 backups (≈ 3 meses de viernes)
    $todos = Get-ChildItem $BACKUP_DIR -Filter "backup_*.sql" | Sort-Object LastWriteTime -Descending
    if ($todos.Count -gt 12) {
        $todos | Select-Object -Skip 12 | ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Host "   Eliminado backup antiguo: $($_.Name)"
        }
    }
} else {
    Write-Error "[$(Get-Date -Format 'HH:mm:ss')] ❌ Error en pg_dump (código: $LASTEXITCODE)"
    exit $LASTEXITCODE
}

# ── Copia de seguridad de PDFs (Carpeta uploads) ──
$UPLOADS_DIR = "C:\Users\JHVEspinosa\.gemini\antigravity\scratch\gestion-uq\backend\uploads"
$PdfFileName = "backup_pdfs_$Fecha.zip"
$PdfFilePath = Join-Path $BACKUP_DIR $PdfFileName

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Iniciando backup de PDFs (uploads)..."
if (Test-Path $UPLOADS_DIR) {
    Compress-Archive -Path $UPLOADS_DIR -DestinationPath $PdfFilePath -Force
    if (Test-Path $PdfFilePath) {
        $PdfSizeKB = [math]::Round((Get-Item $PdfFilePath).Length / 1KB, 1)
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✅ Backup de PDFs guardado: $PdfFileName ($PdfSizeKB KB)"
        
        # Mantener solo los últimos 12 backups de PDFs
        $todosPdf = Get-ChildItem $BACKUP_DIR -Filter "backup_pdfs_*.zip" | Sort-Object LastWriteTime -Descending
        if ($todosPdf.Count -gt 12) {
            $todosPdf | Select-Object -Skip 12 | ForEach-Object {
                Remove-Item $_.FullName -Force
                Write-Host "   Eliminado backup de PDF antiguo: $($_.Name)"
            }
        }
    }
} else {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ⚠️ No se encontró la carpeta de uploads para respaldar."
}
