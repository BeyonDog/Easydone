@echo off
cd /d "%~dp0"
if not exist "Update" mkdir "Update"
echo easydone update HTTP server — keep this window open while publishing.
echo LAN: http://10.21.125.168:8080/
echo.
node scripts/update-http-server.mjs
pause
