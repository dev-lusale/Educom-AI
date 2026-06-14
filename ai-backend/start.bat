@echo off
echo ============================================================
echo   Educom AI Backend — Starting
echo ============================================================

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

REM Copy .env if it doesn't exist
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Please edit .env with your settings before continuing.
    pause
)

REM Start the server
echo Starting Educom AI Backend on http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
