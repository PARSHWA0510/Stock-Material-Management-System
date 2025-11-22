@echo off
REM Quick Setup Script for Stock Material Management System
REM This is a simple wrapper that runs the PowerShell script

echo ========================================
echo Stock Material Management System Setup
echo ========================================
echo.
echo This will run the PowerShell setup script.
echo You need to run this as Administrator.
echo.
pause

powershell -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1"

pause
