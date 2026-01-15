@echo off
echo ===================================================
echo      STARTING FYP BACKEND SYSTEM
echo ===================================================
echo.

:: 1. Start Python Service in a new window
echo [1/2] Launching Cheating Detection Service (Python)...
start "Python Service (DO NOT CLOSE)" cmd /k "cd cheating_detection && call start_service.bat"

:: Wait a moment for Python to init
timeout /t 3 /nobreak >nul

:: 2. Start Node.js Backend in a new window
echo [2/2] Launching Node.js Backend...
start "Node.js Backend (DO NOT CLOSE)" cmd /k "npm start"

echo.
echo ===================================================
echo      ALL SERVICES STARTED
echo ===================================================
echo.
echo Please keep the two new black windows OPEN.
echo.
echo Python Service: http://localhost:8000 (Checks for Cheating)
echo Node Backend:   http://localhost:5000 (Main API)
echo.
pause
