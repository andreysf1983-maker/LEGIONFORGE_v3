@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
title LegionForge Developer Kit - Legion 7.3.5.26124

set "BOOTSTRAP=%CD%\tools\bootstrap.ps1"
if not exist "%BOOTSTRAP%" (
  echo [ERROR] tools\bootstrap.ps1 is missing.
  pause
  exit /b 1
)

echo ================================================================
echo  LegionForge Developer Kit - Legion 7.3.5.26124
echo ================================================================
echo  Step 1/4: Preparing portable tools and checking your server source.
echo           Put your server source into server\source yourself -
echo           CMakeLists.txt must be at server\source\CMakeLists.txt
echo           (uses your locally installed Visual Studio, no winget)
echo ----------------------------------------------------------------
call :run Prepare || goto :failed

if exist "%CD%\server\runtime\authserver.exe" if exist "%CD%\server\runtime\worldserver.exe" goto :ready

echo.
echo ================================================================
echo  No compiled server found yet.
echo  Release x64 build output goes to:  server\runtime\
echo    - server\runtime\authserver.exe
echo    - server\runtime\worldserver.exe
echo ================================================================
set /p "DO_BUILD=Build Release x64 now? [Y/N]: "
if /I not "%DO_BUILD%"=="Y" goto :panel
call :run Build || goto :failed

:ready
echo.
echo ================================================================
echo  Compiled server is ready in:  %CD%\server\runtime
echo  Start it later with run_server.bat, or just re-run START.bat
echo  (it detects the build and skips straight to launch).
echo ================================================================
set /p "DO_RUN=Start MariaDB, AuthServer and WorldServer now? [Y/N]: "
if /I "%DO_RUN%"=="Y" call :run Run || goto :failed

:panel
echo.
set /p "DO_PANEL=Open the LegionForge Control Center (build panel) now? [Y/N]: "
if /I "%DO_PANEL%"=="Y" (
  echo Launching the web panel at http://localhost:3000 ...
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%BOOTSTRAP%" -Mode Panel
)
echo.
echo Done. Build: server\runtime  |  Panel: START_PANEL.bat or arguscore.bin.bat
echo Stop everything the kit started: Stop.bat
exit /b 0

:run
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%BOOTSTRAP%" -Mode %~1
if errorlevel 1 exit /b 1
exit /b 0

:failed
echo.
echo [ERROR] The requested action did not complete.
echo Completed downloads remain in cache\downloads.
echo Detailed logs (when applicable):
echo   runtime\logs\boost-install.log
echo   runtime\logs\boost-innoextract.log
echo Re-run START.bat after reviewing the message above; completed steps are reused.
pause
exit /b 1
