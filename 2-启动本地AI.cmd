@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22 or newer first.
  pause
  exit /b 1
)
if not exist "%~dp0.runtime\local-ai\models\qwen2.5-1.5b-instruct-q4_k_m.gguf" (
  echo.
  echo [NOTICE] The local AI model is not installed on this machine.
  echo          The first run downloads about 1.1 GB and needs Internet.
  echo.
  echo          If you only want to browse the website, close this window
  echo          and open dist\index.html directly - no download needed.
  echo.
  pause
)
node "%~dp0tools\run-local-ai.mjs"
pause
