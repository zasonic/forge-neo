@echo off
setlocal

rem Anchor to this script's folder. Explorer launches with cwd=System32.
cd /d "%~dp0"

rem If this var is set, the electron binary runs as plain Node and skips main-
rem process bootstrap, which makes require('electron') return a path string and
rem crashes app startup. Clear it so the inherited env doesn't poison the run.
set "ELECTRON_RUN_AS_NODE="

set "LOG=%~dp0forge-neo-launch.log"
echo === Forge Neo launch log === > "%LOG%"
echo Started: %DATE% %TIME% >> "%LOG%"
echo Folder:  %~dp0 >> "%LOG%"

echo.
echo === Forge Neo ===
echo.

rem OneDrive paths can cause file-watcher and tsc-compile race issues. Warn but continue.
echo %~dp0 | findstr /i "OneDrive" >nul
if not errorlevel 1 (
    echo Note: this folder is inside OneDrive. If you hit slow startup or
    echo random "file not found" errors, copy the project to a non-OneDrive
    echo folder like C:\dev\forge-neo and run from there.
    echo.
    echo [warn] OneDrive path detected >> "%LOG%"
)

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js was not found.
    echo.
    echo Please install Node.js 20 or newer from:
    echo     https://nodejs.org
    echo.
    echo Then close this window and double-click this file again.
    echo.
    echo [error] node not found >> "%LOG%"
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo First-time setup: installing dependencies.
    echo This can take a few minutes. Please wait...
    echo.
    call npm install
    if errorlevel 1 (
        echo [error] npm install failed >> "%LOG%"
        goto :err
    )
    echo.
)

if not exist "dist\main\index.js" (
    echo Compiling main process...
    call npm run build:main
    if errorlevel 1 (
        echo [error] build:main failed >> "%LOG%"
        goto :err
    )
)

echo Starting Forge Neo. A window will open shortly.
echo Keep this console open while you use the app.
echo Detailed output is logged to forge-neo-launch.log
echo.

call npm run dev
if errorlevel 1 goto :err

endlocal
exit /b 0

:err
echo.
echo Something went wrong. See forge-neo-launch.log for details.
echo Press any key to close this window.
pause >nul
endlocal
exit /b 1
