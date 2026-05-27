# setup_backup_task.ps1 — Registra la tarea de backup en Windows Task Scheduler
# ⚠️ EJECUTAR UNA SOLA VEZ como Administrador:
#    Clic derecho sobre este archivo → "Ejecutar con PowerShell" (como Administrador)

$ErrorActionPreference = "Stop"

$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackupScript = Join-Path $ScriptDir "backup.ps1"

if (-not (Test-Path $BackupScript)) {
    Write-Error "No se encontró backup.ps1 en: $ScriptDir"
    exit 1
}

$TaskName  = "GestionUQ-Backup-Viernes"
$TaskDescr = "Copia de seguridad de la BD gestion-uq. Cada viernes 3:00 PM -> D:\Backups\gestion-uq"

# Eliminar tarea anterior si existe
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Tarea anterior eliminada."
}

# Acción: PowerShell ejecuta backup.ps1
$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -NoProfile -ExecutionPolicy Bypass -File `"$BackupScript`""

# Disparador: cada viernes a las 15:00
$Trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek Friday `
    -At "15:00"

# Configuración: ejecutar aunque la pantalla esté bloqueada
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 5) `
    -StartWhenAvailable

# Registrar
Register-ScheduledTask `
    -TaskName    $TaskName `
    -Description $TaskDescr `
    -Action      $Action `
    -Trigger     $Trigger `
    -Settings    $Settings `
    -RunLevel    Highest `
    -Force | Out-Null

Write-Host ""
Write-Host "✅ Tarea '$TaskName' registrada exitosamente."
Write-Host "   Se ejecutará cada VIERNES a las 3:00 PM."
Write-Host "   Los backups se guardarán en: D:\Backups\gestion-uq\"
Write-Host ""
Write-Host "Para ejecutar ahora manualmente:"
Write-Host "   Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "Para ver el historial de ejecuciones:"
Write-Host "   Get-ScheduledTaskInfo -TaskName '$TaskName'"
