@echo off
echo Starting Python Cheating Detection Service...
echo.

cd /d %~dp0

echo Checking Python installation...
py --version
if errorlevel 1 (
    echo ERROR: Python Launcher 'py' is not found. Trying 'python'...
    python --version
    if errorlevel 1 (
         echo ERROR: neither 'py' nor 'python' found. Please install Python.
         pause
         exit /b 1
    )
    set PY_CMD=python
) else (
    set PY_CMD=py
)

echo.
echo Installing/updating dependencies...
%PY_CMD% -m pip install -r requirements.txt

echo.
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

%PY_CMD% run.py

pause

