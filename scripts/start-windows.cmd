@echo off
cd /d "%~dp0.."
where yarn >nul 2>nul || (echo Install Yarn Classic first. & exit /b 1)
yarn start:desktop
