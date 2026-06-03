@echo off
setlocal
cd /d "%~dp0"
call npm.cmd run tauri build
pause
