@echo off
title RLBot - Installation Script
color 0A

echo.
echo ========================================
echo        RLBot - One-Click Installer
echo ========================================
echo.

:: 1. Check Prerequisites
echo [1/5] Checking prerequisites...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is NOT installed!
    echo Please download and install Node.js LTS from: https://nodejs.org/
    echo After installing, restart this script.
    pause
    exit /b 1
)
echo   - Node.js found.

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is NOT installed!
    echo Please download and install Python 3.10+ from: https://www.python.org/
    echo IMPORTANT: Check "Add Python to PATH" during installation.
    echo After installing, restart this script.
    pause
    exit /b 1
)
echo   - Python found.

set "PROJECT_DIR=%~dp0"

:: 2. Setup Backend (Python)
echo.
echo [2/5] Setting up Backend (Python)...
cd /d "%PROJECT_DIR%backend"

if not exist "venv" (
    echo   - Creating virtual environment (venv^)...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
) else (
    echo   - Virtual environment already exists.
)

echo   - Installing Backend dependencies...
call venv\Scripts\activate
python -m pip install --upgrade pip
:: Use --prefer-binary to avoid compilation errors on Windows
pip install --prefer-binary -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies.
    echo Please check your internet connection or Python version.
    pause
    exit /b 1
)
call venv\Scripts\deactivate
echo   - Backend setup complete.

:: 3. Setup Frontend (Node.js)
echo.
echo [3/5] Setting up Frontend (Node.js)...
cd /d "%PROJECT_DIR%frontend"

if not exist "node_modules" (
    echo   - Installing Frontend dependencies (this may take a while^)...
    call npm install
) else (
    echo   - node_modules found, skipping install (delete folder to reinstall^).
)

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies.
    pause
    exit /b 1
)
echo   - Frontend setup complete.

:: 4. Environment Configuration
echo.
echo [4/5] Checking configuration...
cd /d "%PROJECT_DIR%"

if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo   [INFO] Created backend\.env from example.
        echo   [IMPORTANT] You MUST edit backend\.env with your API Keys!
    ) else (
        echo   [WARNING] backend\.env.example not found. Please create backend\.env manually.
    )
) else (
    echo   - backend\.env exists.
)

if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        copy "frontend\.env.example" "frontend\.env" >nul
        echo   [INFO] Created frontend\.env from example.
    )
)

:: 5. Finalize
echo.
echo ========================================
echo        Installation Complete!
echo ========================================
echo.
echo To start the application, run 'start.bat'.
echo.
echo IMPORTANT: If this is a fresh install, remember to edit 'backend\.env' 
echo with your SUPABASE_URL, SUPABASE_KEY and GEMINI_API_KEY.
echo.
pause
