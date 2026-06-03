@echo off
cd /d "%~dp0"
echo Installing easydone update HTTP autostart (hidden at logon)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-update-autostart.ps1"
if errorlevel 1 (
  echo Install failed.
  pause
  exit /b 1
)
pause
