@echo off
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (echo Please install Node.js 20 or newer first. & pause & exit /b 1)
start "" http://127.0.0.1:4343
node server.js
pause
