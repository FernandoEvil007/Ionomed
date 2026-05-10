Set-Location $PSScriptRoot
Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$PSScriptRoot\backend'; npm.cmd run dev") -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Hidden
Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm.cmd run dev") -WorkingDirectory "$PSScriptRoot\frontend" -WindowStyle Hidden
Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"
