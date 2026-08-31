@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo   StratumTree Plugin Installer Launcher
echo ===================================================

:: Sblocca automaticamente i file contro il blocco di Windows
powershell -NoProfile -Command "Get-ChildItem -Path '%~dp0' -Recurse | Unblock-File -ErrorAction SilentlyContinue"

:: 1. Avvia l'installer grafico EXE
if exist "%~dp0StratumTreeInstallerGUI.exe" (
    echo Avvio interfaccia grafica StratumTreeInstallerGUI.exe...
    start "" "%~dp0StratumTreeInstallerGUI.exe"
    exit /b 0
)

:: 2. Fallback su PowerShell GUI
if exist "%~dp0scripts\install.ps1" (
    echo Avvio installer PowerShell...
    powershell -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1"
    pause
    exit /b 0
)

:: 3. Fallback su Python
if exist "%~dp0scripts\installer.py" (
    echo Avvio installer Python...
    python "%~dp0scripts\installer.py"
    pause
    exit /b 0
)

pause