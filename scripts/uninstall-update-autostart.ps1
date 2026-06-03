# Remove easydone update HTTP autostart scheduled task.
$ErrorActionPreference = "Stop"

$TaskName = "easydone-update-http"

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "Task not found: $TaskName (nothing to remove)" -ForegroundColor Yellow
    exit 0
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed scheduled task: $TaskName" -ForegroundColor Green
Write-Host "If HTTP is still running, end the node process in Task Manager or reboot."
