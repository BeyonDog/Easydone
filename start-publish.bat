@echo off
cd /d "%~dp0"
set NOTES=
if not "%~1"=="" set NOTES=%~1
node scripts/publish-update.mjs --notes "%NOTES%"
pause
