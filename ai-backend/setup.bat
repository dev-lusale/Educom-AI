@echo off
echo ============================================================
echo   Educom AI Backend — First-Time Setup
echo ============================================================
echo.

REM Check Python version
python --version 2>nul
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Download Python 3.11+ from https://python.org
    pause
    exit /b 1
)

echo Step 1: Creating virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

echo.
echo Step 2: Installing Python dependencies...
pip install --upgrade pip --quiet
pip install -r requirements.txt

echo.
echo Step 3: Setting up environment file...
if not exist ".env" (
    copy .env.example .env
    echo Created .env — please edit it with your settings.
) else (
    echo .env already exists, skipping.
)

echo.
echo Step 4: Creating required directories...
if not exist "uploads" mkdir uploads
if not exist "curriculum_docs" mkdir curriculum_docs
if not exist "vector_db\chroma_store" mkdir vector_db\chroma_store

echo.
echo ============================================================
echo   Setup Complete!
echo ============================================================
echo.
echo Next steps:
echo   1. Install Ollama: https://ollama.com
echo   2. Pull a model:   ollama pull phi3
echo   3. Start Ollama:   ollama serve
echo   4. Start backend:  start.bat
echo   5. Add to Educom .env.local: AI_BACKEND_URL=http://localhost:8000
echo.
echo Optional: Place curriculum PDFs in curriculum_docs/ folder
echo           They will be auto-ingested on startup.
echo.
pause
