@echo off
REM Hierarchical Table / StratumTree Chart Plugin Installer Runner
echo Avvio installazione StratumTree Hierarchical Table Plugin per Apache Superset...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-plugin.ps1" %*
pause
