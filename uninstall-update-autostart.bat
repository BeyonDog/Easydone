@echo off
cd /d "%~dp0"
echo Removing easydone update HTTP autostart...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-update-autostart.ps1"
pause
