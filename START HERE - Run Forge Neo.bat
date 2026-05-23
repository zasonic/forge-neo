@echo off
setlocal

rem Anchor to this script's folder. Explorer launches with cwd=System32.
cd /d "%~dp0"

echo.
echo === Forge Neo ===
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js was not found.
    echo.
    echo Please install Node.js 20 or newer from:
    echo     https://nodejs.org
    echo.
    echo Then close this window and double-click this file again.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo First-time setup: installing dependencies.
    echo This can take a few minutes. Please wait...
    echo.
    call npm install
    if errorlevel 1 goto :err
    echo.
)

echo Starting Forge Neo. A window will open shortly.
echo Keep this console open while you use the app.
echo.

call npm run dev
if errorlevel 1 goto :err

endlocal
exit /b 0

:err
echo.
echo Something went wrong. The message above explains what.
echo Press any key to close this window.
pause >nul
endlocal
exit /b 1
