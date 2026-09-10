@echo off
setlocal
cd /d "%~dp0"

:: Sblocca automaticamente eventuali file scaricati/estratti
powershell -NoProfile -Command "Get-ChildItem -Path '%~dp0' -Recurse | Unblock-File -ErrorAction SilentlyContinue"

:: Se sono passati argomenti da linea di comando, inoltrali direttamente all'installer PowerShell
if not "%~1"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-plugin.ps1" %*
    exit /b %ERRORLEVEL%
)

echo ============================================================
echo   Hierarchical Table / StratumTree - Superset Plugin Installer
echo   Matrice ad Albero & Tabella Gerarchica per Apache Superset
echo ============================================================
echo   [1] Esegui Installer PowerShell (install-plugin.ps1) [Consigliato]
echo   [2] Avvia Interfaccia Grafica Windows (StratumTreeInstallerGUI.exe)
echo   [3] Installazione Pulita da Zero (Clean Reinstall)
echo   [4] Ricompila ed Avvia Docker non-dev (up -d --build superset)
echo   [5] Riavvia solo Container Docker (restart superset)
echo   [6] Annulla ed Esci
echo ============================================================
set /p CHOICE="Seleziona un'opzione [1/2/3/4/5/6, Invio per default: 1]: "

if "%CHOICE%"=="2" goto run_gui
if "%CHOICE%"=="3" goto run_clean_reinstall
if "%CHOICE%"=="4" goto run_docker_non_dev
if "%CHOICE%"=="5" goto run_docker_restart
if "%CHOICE%"=="6" goto end
goto run_ps

:run_ps
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-plugin.ps1"
goto end

:run_gui
if exist "%~dp0StratumTreeInstallerGUI.exe" (
    echo Avvio interfaccia grafica StratumTreeInstallerGUI.exe...
    start "" "%~dp0StratumTreeInstallerGUI.exe"
    exit /b 0
) else (
    echo [ERRORE] StratumTreeInstallerGUI.exe non trovato!
    pause
    exit /b 1
)

:run_clean_reinstall
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-plugin.ps1" -CleanReinstall
goto end

:run_docker_non_dev
echo Sincronizzazione file plugin nel repository Superset...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-plugin.ps1" -SkipBuild
if exist "C:\Users\admmaps\superset_6_1_0\superset\docker-compose-non-dev.yml" (
    cd /d "C:\Users\admmaps\superset_6_1_0\superset"
    echo Esecuzione: docker compose -f docker-compose-non-dev.yml up -d --build superset
    docker compose -f docker-compose-non-dev.yml up -d --build superset
) else if exist "D:\Sviluppo\superset\docker-compose-non-dev.yml" (
    cd /d "D:\Sviluppo\superset"
    echo Esecuzione: docker compose -f docker-compose-non-dev.yml up -d --build superset
    docker compose -f docker-compose-non-dev.yml up -d --build superset
) else (
    echo [INFO] Per avviare Docker, esegui nella cartella di Superset:
    echo docker compose -f docker-compose-non-dev.yml up -d --build superset
)
goto end

:run_docker_restart
echo Sincronizzazione file plugin nel repository Superset...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-plugin.ps1" -SkipBuild
if exist "C:\Users\admmaps\superset_6_1_0\superset\docker-compose-non-dev.yml" (
    cd /d "C:\Users\admmaps\superset_6_1_0\superset"
    echo Esecuzione: docker compose -f docker-compose-non-dev.yml restart superset
    docker compose -f docker-compose-non-dev.yml restart superset
) else if exist "D:\Sviluppo\superset\docker-compose-non-dev.yml" (
    cd /d "D:\Sviluppo\superset"
    echo Esecuzione: docker compose -f docker-compose-non-dev.yml restart superset
    docker compose -f docker-compose-non-dev.yml restart superset
) else (
    echo [INFO] Per riavviare Superset, esegui nella cartella di Superset:
    echo docker compose restart superset
)
goto end

:end
pause
