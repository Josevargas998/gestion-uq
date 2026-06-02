Set WshShell = CreateObject("WScript.Shell")
batPath = Chr(34) & WScript.ScriptFullName & Chr(34)

' Ruta de la carpeta del proyecto (misma carpeta que este script)
Dim fso, folder
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)

' Iniciar backend en silencio (sin ventana)
WshShell.Run "cmd /c cd /d """ & folder & """ && node backend/server.js", 0, False

' Esperar 2 segundos para que el backend arranque
WScript.Sleep 2000

' Iniciar frontend en silencio (sin ventana)
WshShell.Run "cmd /c cd /d """ & folder & """ && npm run dev", 0, False

' Esperar 6 segundos para que Vite compile
WScript.Sleep 6000

' Abrir el navegador
WshShell.Run "http://localhost:5173"
