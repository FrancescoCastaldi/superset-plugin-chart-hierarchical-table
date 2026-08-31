#!/usr/bin/env python3
"""
Apache Superset 6.1.0 - Automated Chart Plugin Installer
Author: Francesco Castaldi
Description: Cross-platform installer for integrating the Hierarchical Table Chart Plugin
into an existing Superset repository (Docker Compose non-dev / dev / Local).
"""

import os
import sys
import shutil
import json
import re
import argparse
import subprocess
from pathlib import Path


def log_info(msg: str):
    print(f"\033[94m[INFO]\033[0m {msg}")


def log_success(msg: str):
    print(f"\033[92m[SUCCESS]\033[0m {msg}")


def log_warn(msg: str):
    print(f"\033[93m[WARNING]\033[0m {msg}")


def log_error(msg: str):
    print(f"\033[91m[ERROR]\033[0m {msg}")


def find_superset_frontend(superset_root: Path) -> Path:
    frontend_dir = superset_root / "superset-frontend"
    if frontend_dir.is_dir() and (frontend_dir / "package.json").is_file():
        return frontend_dir
    raise FileNotFoundError(
        f"Could not find 'superset-frontend/package.json' inside '{superset_root}'. "
        "Please ensure the path points to the root of the Apache Superset repository."
    )


def find_main_preset(frontend_dir: Path) -> Path:
    candidates = [
        frontend_dir / "src" / "visualizations" / "presets" / "MainPreset.js",
        frontend_dir / "src" / "visualizations" / "presets" / "MainPreset.ts",
        frontend_dir / "src" / "setup" / "setupPlugins.ts",
        frontend_dir / "src" / "setup" / "setupPlugins.js",
    ]
    for c in candidates:
        if c.is_file():
            return c
    raise FileNotFoundError(
        f"Could not locate MainPreset or setupPlugins file in '{frontend_dir}/src'."
    )


def backup_file(file_path: Path):
    bak_path = file_path.with_suffix(file_path.suffix + ".bak")
    if not bak_path.exists():
        shutil.copy2(file_path, bak_path)
        log_info(f"Created backup: {bak_path.name}")


def restore_backup(file_path: Path):
    bak_path = file_path.with_suffix(file_path.suffix + ".bak")
    if bak_path.is_file():
        shutil.copy2(bak_path, file_path)
        log_info(f"Restored {file_path.name} from backup.")


def copy_plugin_files(plugin_root: Path, frontend_dir: Path) -> tuple[str, bool]:
    src_plugin_package = plugin_root / "packages" / "superset-plugin-chart-hierarchical-table"
    if not src_plugin_package.exists():
        src_plugin_package = plugin_root / "frontend"
    if not src_plugin_package.exists():
        raise FileNotFoundError(f"Source plugin directory not found in '{plugin_root}'")

    plugins_target_dir = frontend_dir / "plugins"
    plugins_target_dir.mkdir(parents=True, exist_ok=True)

    dest_plugin_dir = plugins_target_dir / "superset-plugin-chart-hierarchical-table"
    is_update = dest_plugin_dir.exists()

    if is_update:
        log_info(f"🧹 Pulizia e rimozione forzata cartella obsoleta: {dest_plugin_dir.name}...")
        shutil.rmtree(dest_plugin_dir, ignore_errors=True)

    log_info(f"Copia da zero dei sorgenti del plugin in '{dest_plugin_dir.name}'...")
    shutil.copytree(
        src_plugin_package,
        dest_plugin_dir,
        ignore=shutil.ignore_patterns("node_modules", "dist", ".git", ".turbo", "*.log")
    )
    log_success(f"Sorgenti plugin aggiornati con successo in {dest_plugin_dir}")
    return "./plugins/superset-plugin-chart-hierarchical-table", is_update


def patch_package_json(frontend_dir: Path, plugin_rel_path: str):
    pkg_file = frontend_dir / "package.json"
    backup_file(pkg_file)

    with open(pkg_file, "r", encoding="utf-8") as f:
        pkg_data = json.load(f)

    deps = pkg_data.setdefault("dependencies", {})
    plugin_name = "superset-plugin-chart-hierarchical-table"
    deps[plugin_name] = f"file:{plugin_rel_path}"

    with open(pkg_file, "w", encoding="utf-8") as f:
        json.dump(pkg_data, f, indent=2)
        f.write("\n")

    log_success(f"Added '{plugin_name}' to {pkg_file.name}")


def patch_main_preset(preset_file: Path):
    backup_file(preset_file)

    with open(preset_file, "r", encoding="utf-8") as f:
        content = f.read()

    import_stmt = "import { HierarchicalTableChartPlugin } from '../../../plugins/superset-plugin-chart-hierarchical-table/src';\n"
    register_stmt = "        new HierarchicalTableChartPlugin().configure({ key: 'hierarchical_table' }).register(),\n"

    if "HierarchicalTableChartPlugin" in content:
        log_warn(f"Plugin is already imported in {preset_file.name}. Skipping injection.")
        return

    content = import_stmt + content
    plugins_match = re.search(r"plugins\s*:\s*\[", content)
    if plugins_match:
        insert_pos = plugins_match.end()
        content = content[:insert_pos] + "\n" + register_stmt + content[insert_pos:]
    else:
        content += f"\nnew HierarchicalTableChartPlugin().configure({{ key: 'hierarchical_table' }}).register();\n"

    with open(preset_file, "w", encoding="utf-8") as f:
        f.write(content)

    log_success(f"Registered plugin in {preset_file.name}")


def trigger_docker_build(superset_root: Path, compose_file: str = "docker-compose-non-dev.yml"):
    log_info(f"Avvio Docker Compose Build con file '{compose_file}'...")
    try:
        cmd = ["docker", "compose", "-f", compose_file, "up", "-d", "--build", "superset"]
        if not (superset_root / compose_file).exists():
            log_warn(f"File '{compose_file}' non trovato in {superset_root}, fallback su 'docker compose up -d --build superset'")
            cmd = ["docker", "compose", "up", "-d", "--build", "superset"]

        log_info(f"Esecuzione: {' '.join(cmd)}")
        subprocess.run(cmd, cwd=superset_root, check=True)
        log_success(f"Container Superset ricostruito e avviato con successo!")
    except Exception as e:
        log_warn(f"Errore durante l'esecuzione di Docker Compose: {e}")
        log_info(f"Puoi eseguire manualmente: docker compose -f {compose_file} up -d --build superset")


def main():
    parser = argparse.ArgumentParser(
        description="Automated installer for Superset Hierarchical Table Chart Plugin"
    )
    parser.add_argument(
        "--superset-path",
        "-s",
        type=str,
        required=True,
        help="Path to the local Apache Superset repository root"
    )
    parser.add_argument(
        "--compose-file",
        "-c",
        type=str,
        default="docker-compose-non-dev.yml",
        help="Docker compose file to use (e.g. docker-compose-non-dev.yml or docker-compose.yml)"
    )
    parser.add_argument(
        "--docker",
        action="store_true",
        default=True,
        help="Build and restart Docker compose superset service"
    )
    parser.add_argument(
        "--no-docker",
        dest="docker",
        action="store_false",
        help="Do not touch Docker containers"
    )

    args = parser.parse_args()
    superset_root = Path(args.superset_path).resolve()
    script_dir = Path(__file__).resolve().parent
    plugin_root = script_dir.parent

    if not superset_root.is_dir():
        log_error(f"Superset path '{superset_root}' does not exist.")
        sys.exit(1)

    print("=" * 65)
    print("  Apache Superset 6.1.0 - Hierarchical Table Plugin Installer")
    print("=" * 65)
    log_info(f"Target Superset Path: {superset_root}")
    log_info(f"Plugin Root Path:   {plugin_root}")
    log_info(f"Docker Compose File: {args.compose_file}")

    try:
        frontend_dir = find_superset_frontend(superset_root)
        preset_file = find_main_preset(frontend_dir)

        # 1. Clean and Copy plugin files in superset-frontend/plugins/
        rel_path, is_update = copy_plugin_files(plugin_root, frontend_dir)

        # 2. Patch package.json
        patch_package_json(frontend_dir, rel_path)

        # 3. Patch MainPreset
        patch_main_preset(preset_file)

        action_label = "REINSTALLAZIONE PULITA" if is_update else "INSTALLAZIONE"
        log_success(f"Tutti i file del frontend e le registrazioni completate con successo ({action_label})!")

        # 4. Handle Docker Compose Build
        if args.docker:
            trigger_docker_build(superset_root, args.compose_file)

        print("\n" + "=" * 65)
        log_success(f"{action_label} COMPLETATA CON SUCCESSO!")
        print("=" * 65)

    except Exception as e:
        log_error(f"Installation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()