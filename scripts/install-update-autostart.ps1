# Register easydone update HTTP server to start hidden at user logon.
$ErrorActionPreference = "Stop"

$TaskName = "easydone-update-http"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: node not found. Install Node.js and add it to PATH." -ForegroundColor Red
    exit 1
}
$nodeExe = $node.Source

$updateDir = Join-Path $root "Update"
if (-not (Test-Path $updateDir)) {
    New-Item -ItemType Directory -Path $updateDir | Out-Null
}
$logPath = Join-Path $updateDir "update-http.log"

# Redirect stdout/stderr to log; run from project root (cmd.exe handles &&).
$argList = ('/c cd /d "{0}" && "{1}" scripts\update-http-server.mjs >> "{2}" 2>&1' -f $root, $nodeExe, $logPath)
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument $argList -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "easydone LAN update HTTP (port 8080, Update folder)" `
    -Force | Out-Null

$task = Get-ScheduledTask -TaskName $TaskName
$task.Settings.Hidden = $true
Set-ScheduledTask -InputObject $task | Out-Null

Write-Host "Registered scheduled task: $TaskName" -ForegroundColor Green
Write-Host "  Project: $root"
Write-Host "  Log: $logPath"
Write-Host "  LAN: http://10.21.125.168:8080/"
Write-Host ""
Write-Host "Log off and sign in again (or reboot) to start. Run uninstall-update-autostart.bat to remove."
