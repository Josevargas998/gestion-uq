Add-Type -AssemblyName System.Drawing

# Convertir PNG a ICO
$png = [System.Drawing.Image]::FromFile("C:\Users\JHVEspinosa\.gemini\antigravity\scratch\gestion-uq\public\favicon.png")
$bitmap = New-Object System.Drawing.Bitmap($png, 256, 256)
$ms = New-Object System.IO.MemoryStream

# Encabezado ICO
$writer = New-Object System.IO.BinaryWriter($ms)
$writer.Write([int16]0)          # reservado
$writer.Write([int16]1)          # tipo: 1=ICO
$writer.Write([int16]1)          # cantidad de imágenes

# Directorio de imagen
$writer.Write([byte]0)           # ancho (0 = 256)
$writer.Write([byte]0)           # alto (0 = 256)
$writer.Write([byte]0)           # paleta
$writer.Write([byte]0)           # reservado
$writer.Write([int16]1)          # planos de color
$writer.Write([int16]32)         # bits por pixel
$pngStream = New-Object System.IO.MemoryStream
$bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $pngStream.ToArray()
$writer.Write([int32]$pngBytes.Length) # tamaño de imagen
$writer.Write([int32]22)               # offset desde inicio

$writer.Write($pngBytes)
$icoBytes = $ms.ToArray()

$icoPath = "C:\Users\JHVEspinosa\.gemini\antigravity\scratch\gestion-uq\public\favicon.ico"
[System.IO.File]::WriteAllBytes($icoPath, $icoBytes)

$png.Dispose()
$bitmap.Dispose()

# Actualizar el acceso directo con el ícono ICO
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Gestion UQ.lnk")
$Shortcut.TargetPath = "C:\Users\JHVEspinosa\.gemini\antigravity\scratch\gestion-uq\Iniciar Gestion UQ.bat"
$Shortcut.WorkingDirectory = "C:\Users\JHVEspinosa\.gemini\antigravity\scratch\gestion-uq"
$Shortcut.Description = "Sistema CIARP / CEI - Productividad Docente - Universidad del Quindio"
$Shortcut.IconLocation = "$icoPath,0"
$Shortcut.WindowStyle = 1
$Shortcut.Save()

Write-Host "Icono ICO creado y acceso directo actualizado en el Escritorio."
