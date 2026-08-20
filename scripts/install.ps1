<#
.SYNOPSIS
    Installer automatico per Apache Superset 6.1.0 (Windows PowerShell).
.DESCRIPTION
    Installa e registra il plugin 'Hierarchical Table' all'interno del repository
    Apache Superset 6.1.0 avviato con Docker Compose su Windows.
.PARAMETER SupersetPath
    Percorso della cartella radice di Apache Superset (es. C:\Users\Username\superset).
.PARAMETER Rollback
    Ripristina i file originali di Superset dal backup (.bak).
.PARAMETER NoDocker
    Non esegue comandi Docker Compose.
.EXAMPLE
    .\install.ps1 -SupersetPath "C:\Projects\superset"
#>

[CmdletBinding()]
param (
    [string]$SupersetPath,
    [switch]$Rollback,
    [switch]$NoDocker
)

$ErrorActionPreference = "Stop"

function Write-Color([string]$text, [string]$color) {
    Write-Host $text -ForegroundColor $color
}

Write-Color "================================================================" "Cyan"
Write-Color "  Apache Superset 6.1.0 - Hierarchical Table Chart Installer    " "Cyan"
Write-Color "  Windows PowerShell Automation Script                          " "Cyan"
Write-Color "================================================================" "Cyan"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginRoot = Split-Path -Parent $ScriptDir
$PythonInstaller = Join-Path $ScriptDir "installer.py"

# Se SupersetPath non e' stato fornito, chiedilo all'utente
if (-not $SupersetPath) {
    Write-Host ""
    Write-Color "Inserisci il percorso della cartella radice di Apache Superset 6.1.0:" "Yellow"
    $SupersetPath = Read-Host "Percorso (es. C:\Users\Nome\superset o ..\superset)"
}

if (-not (Test-Path $SupersetPath)) {
    Write-Color "[ERRORE] Il percorso '$SupersetPath' non esiste!" "Red"
    exit 1
}

$ResolvedSupersetPath = (Resolve-Path $SupersetPath).Path
Write-Color "[INFO] Cartella Superset: $ResolvedSupersetPath" "Gray"
Write-Color "[INFO] Cartella Plugin:   $PluginRoot" "Gray"

# Verifica se Python e' disponibile
$PythonCmd = Get-Command "python" -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    $PythonCmd = Get-Command "python3" -ErrorAction SilentlyContinue
}

if ($PythonCmd) {
    Write-Color "[INFO] Esecuzione installer Python avanzato..." "Green"
    $argsList = @($PythonInstaller, "--superset-path", $ResolvedSupersetPath)
    if ($Rollback) {
        $argsList += "--rollback"
    }
    if ($NoDocker) {
        $argsList += "--no-docker"
    }

    & $PythonCmd.Source $argsList
} else {
    Write-Color "[INFO] Python non rilevato nel PATH. Esecuzione procedura PowerShell nativa..." "Yellow"
    
    $FrontendDir = Join-Path $ResolvedSupersetPath "superset-frontend"
    if (-not (Test-Path $FrontendDir)) {
        Write-Color "[ERRORE] Impossibile trovare la cartella 'superset-frontend' in $ResolvedSupersetPath" "Red"
        exit 1
    }

    $PluginsDir = Join-Path $FrontendDir "plugins"
    if (-not (Test-Path $PluginsDir)) {
        New-Item -ItemType Directory -Path $PluginsDir -Force | Out-Null
    }

    $DestDir = Join-Path $PluginsDir "superset-plugin-chart-hierarchical-table"
    $SrcFrontend = Join-Path $PluginRoot "packages\superset-plugin-chart-hierarchical-table"
    if (-not (Test-Path $SrcFrontend)) {
        $SrcFrontend = Join-Path $PluginRoot "frontend"
    }

    # Copia sorgenti
    Write-Color "[INFO] Copia dei file del plugin in $DestDir..." "Green"
    if (Test-Path $DestDir) {
        Remove-Item -Recurse -Force $DestDir
    }
    Copy-Item -Path $SrcFrontend -Destination $DestDir -Recurse -Exclude @("node_modules", "dist", ".git")

    # Patch MainPreset
    $PresetPath = Join-Path $FrontendDir "src\visualizations\presets\MainPreset.js"
    if (-not (Test-Path $PresetPath)) {
        $PresetPath = Join-Path $FrontendDir "src\visualizations\presets\MainPreset.ts"
    }

    if (Test-Path $PresetPath) {
        $BakPath = "$PresetPath.bak"
        if (-not (Test-Path $BakPath)) {
            Copy-Item -Path $PresetPath -Destination $BakPath
        }

        $Content = Get-Content -Raw -Path $PresetPath
        $ImportStmt = "import { HierarchicalTableChartPlugin } from 'superset-plugin-chart-hierarchical-table';"
        $RegStmt = "        new HierarchicalTableChartPlugin().configure({ key: 'hierarchical_table' }).register(),"

        if (-not ($Content.Contains("HierarchicalTableChartPlugin"))) {
            $Content = "$ImportStmt`n$Content"
            $Content = $Content -replace "(plugins\s*:\s*\[)", "`$1`n$RegStmt"
            Set-Content -Path $PresetPath -Value $Content -NoNewline
            Write-Color "[SUCCESS] MainPreset aggiornato con successo!" "Green"
        }
    }

    Write-Color "================================================================" "Cyan"
    Write-Color " Installazione completata con successo!                         " "Green"
    Write-Color "================================================================" "Cyan"
    Write-Color "Se usi Docker Compose, riavvia il container frontend:" "Yellow"
    Write-Color "  docker compose restart superset-node" "White"
}
