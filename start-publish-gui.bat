@echo off
cd /d "%~dp0"
set CI=true
set TAURI_SIGNING_PRIVATE_KEY_PASSWORD=
echo easydone publish GUI — keep this window open.
echo Server will open http://127.0.0.1:1421/ in your browser when ready.
echo.
node scripts/publish-server.mjs
pause
