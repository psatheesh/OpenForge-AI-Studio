@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\windows\build-installer.ps1"
if errorlevel 1 (echo Build failed. See errors above. & pause & exit /b 1)
echo Installer output: %~dp0dist
pause
