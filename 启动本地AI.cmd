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
  echo [提示] 本机还没有本地模型，继续运行会联网下载约 1.1 GB 的模型文件。
  echo [提示] 只是想浏览网站的话，请关闭本窗口，改双击「打开网页.cmd」，
  echo        或者直接打开 dist\index.html，不需要下载任何文件。
  echo.
  pause
)
node "%~dp0tools\run-local-ai.mjs"
pause
