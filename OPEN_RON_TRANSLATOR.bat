@echo off
title Ron Translator Launcher
cd /d "%~dp0"
echo.
echo ========================================
echo        Ron Translator Launcher
echo ========================================
echo.
echo Opening Ron Translator in your browser...
echo.
start "" "%~dp0index.html"
echo Done! You can close this window.
timeout /t 3 >nul
exit
