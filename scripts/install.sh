#!/usr/bin/env bash
# ==============================================================================
# Apache Superset 6.1.0 - Hierarchical Table Chart Plugin Installer (Bash)
# Author: Francesco Castaldi
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_INSTALLER="$SCRIPT_DIR/installer.py"

if command -v python3 &>/dev/null; then
    python3 "$PYTHON_INSTALLER" "$@"
elif command -v python &>/dev/null; then
    python "$PYTHON_INSTALLER" "$@"
else
    echo -e "\033[91m[ERROR]\033[0m Python is required to run the installer. Please install Python 3.9+."
    exit 1
fi
