@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

:: 1. Imposta la cartella sorgente come la cartella da cui viene lanciato questo bat
cd /d "%~dp0"
set "PLUGIN_DIR=%~dp0"
if "%PLUGIN_DIR:~-1%"=="\" set "PLUGIN_DIR=%PLUGIN_DIR:~0,-1%"

echo ==============================================================================
echo   INSTALLAZIONE / AGGIORNAMENTO PLUGIN SUPERSET: StratumTree Hierarchical Table
echo   Cartella sorgente: "%PLUGIN_DIR%"
echo ==============================================================================
echo.

:: 2. Esecuzione script PowerShell con passaggio esplicito della cartella sorgente
powershell -NoProfile -ExecutionPolicy Bypass -File "%PLUGIN_DIR%\install-plugin.ps1" -PluginPath "%PLUGIN_DIR%" %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRORE] L'installazione di Hierarchical Table ha riscontrato un errore (Codice: %ERRORLEVEL%).
) else (
    echo.
    echo [OK] Hierarchical Table aggiornato e registrato con successo!
)

echo.
pause
