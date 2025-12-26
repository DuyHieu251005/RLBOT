@echo off
title RLBot - Launcher
color 0A

echo ========================================
echo        RLBot - Chat Application
echo ========================================
echo.

set "PROJECT_DIR=%~dp0"

:: 1. Check & Setup Backend
if not exist "%PROJECT_DIR%backend\venv" (
    echo [SETUP] Creating Backend Environment...
    cd /d "%PROJECT_DIR%backend"
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd /d "%PROJECT_DIR%"
)

:: 2. Check & Setup Frontend
if not exist "%PROJECT_DIR%frontend\node_modules" (
    echo [SETUP] Installing Frontend Dependencies...
    cd /d "%PROJECT_DIR%frontend"
    call npm install
    cd /d "%PROJECT_DIR%"
)

:: 3. Launch Services
echo [LAUNCH] Starting Backend...
start "RLBot Backend" "%PROJECT_DIR%start_backend.bat"

echo [LAUNCH] Starting Frontend...
start "RLBot Frontend" "%PROJECT_DIR%start_frontend.bat"

echo [LAUNCH] Opening Browser...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo        Services Launched!
echo ========================================
echo.
echo You can close this window now.
echo Use the other windows to monitor logs.
pause
