#!/usr/bin/env python3
"""
Apache Superset 6.1.0 - Automated Chart Plugin Installer
Author: Francesco Castaldi
Description: Cross-platform installer for integrating the Hierarchical Table Chart Plugin
into an existing Superset repository (Docker Compose / Local Dev).
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
    """Locates the superset-frontend directory."""
    frontend_dir = superset_root / "superset-frontend"
    if frontend_dir.is_dir() and (frontend_dir / "package.json").is_file():
        return frontend_dir
    raise FileNotFoundError(
        f"Could not find 'superset-frontend/package.json' inside '{superset_root}'. "
        "Please ensure the path points to the root of the Apache Superset repository."
    )


def find_main_preset(frontend_dir: Path) -> Path:
    """Finds MainPreset.js, MainPreset.ts, or setupPlugins.ts."""
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
    """Creates a .bak backup of the given file if not already present."""
    bak_path = file_path.with_suffix(file_path.suffix + ".bak")
    if not bak_path.exists():
        shutil.copy2(file_path, bak_path)
        log_info(f"Created backup: {bak_path.name}")


def restore_backup(file_path: Path):
    """Restores a .bak backup if present."""
    bak_path = file_path.with_suffix(file_path.suffix + ".bak")
    if bak_path.is_file():
        shutil.copy2(bak_path, file_path)
        log_info(f"Restored {file_path.name} from backup.")


def patch_package_json(frontend_dir: Path, plugin_rel_path: str):
    """Adds the plugin to superset-frontend/package.json dependencies."""
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
    """Injects plugin import and registration into MainPreset / setupPlugins."""
    backup_file(preset_file)

    with open(preset_file, "r", encoding="utf-8") as f:
        content = f.read()

    import_stmt = "import { HierarchicalTableChartPlugin } from 'superset-plugin-chart-hierarchical-table';"
    register_stmt = "        new HierarchicalTableChartPlugin().configure({ key: 'hierarchical_table' }).register(),"

    if import_stmt in content or "HierarchicalTableChartPlugin" in content:
        log_warn("Plugin is already imported in MainPreset. Skipping injection.")
        return

    # 1. Inject import statement near top
    import_match = re.search(r"(import .*?;\n)(?!import)", content, re.MULTILINE)
    if import_match:
        idx = import_match.end()
        content = content[:idx] + import_stmt + "\n" + content[idx:]
    else:
        content = import_stmt + "\n" + content

    # 2. Inject registration into plugins array
    # Look for plugins: [ ... ] or new Preset({ ... plugins: [ ... ] })
    plugins_match = re.search(r"(plugins\s*:\s*\[)", content)
    if plugins_match:
        idx = plugins_match.end()
        content = content[:idx] + "\n" + register_stmt + content[idx:]
    else:
        # Fallback search for class constructor or array
        array_match = re.search(r"(\[\s*new\s+\w+ChartPlugin)", content)
        if array_match:
            idx = array_match.start() + 1
            content = content[:idx] + "\n" + register_stmt + content[idx:]
        else:
            log_warn("Could not find standard 'plugins: [...]' array. Appending registration.")
            content += f"\nnew HierarchicalTableChartPlugin().configure({{ key: 'hierarchical_table' }}).register();\n"

    with open(preset_file, "w", encoding="utf-8") as f:
        f.write(content)

    log_success(f"Registered plugin in {preset_file.name}")


def copy_plugin_files(plugin_root: Path, frontend_dir: Path) -> str:
    """Copies frontend plugin directory into superset-frontend/plugins/."""
    target_plugins_dir = frontend_dir / "plugins"
    target_plugins_dir.mkdir(parents=True, exist_ok=True)

    dest_dir = target_plugins_dir / "superset-plugin-chart-hierarchical-table"
    src_frontend_dir = plugin_root / "frontend"

    if not src_frontend_dir.is_dir():
        raise FileNotFoundError(f"Source frontend plugin directory '{src_frontend_dir}' not found.")

    if dest_dir.exists():
        log_info(f"Removing existing plugin destination at '{dest_dir.name}'")
        shutil.rmtree(dest_dir)

    # Exclude node_modules and build artifacts from copy
    def ignore_patterns(path, names):
        return [n for n in names if n in ("node_modules", "dist", ".git", ".turbo")]

    shutil.copytree(src_frontend_dir, dest_dir, ignore=ignore_patterns)
    log_success(f"Copied plugin sources to {dest_dir}")

    # Return relative path from superset-frontend
    return "./plugins/superset-plugin-chart-hierarchical-table"


def rollback(superset_root: Path):
    """Rolls back all modifications."""
    frontend_dir = find_superset_frontend(superset_root)
    preset_file = find_main_preset(frontend_dir)
    pkg_file = frontend_dir / "package.json"

    restore_backup(preset_file)
    restore_backup(pkg_file)

    plugin_dir = frontend_dir / "plugins" / "superset-plugin-chart-hierarchical-table"
    if plugin_dir.exists():
        shutil.rmtree(plugin_dir)
        log_info(f"Removed {plugin_dir}")

    log_success("Rollback completed successfully.")


def trigger_docker_build(superset_root: Path):
    """Attempts to restart superset_node container or run npm install inside container."""
    log_info("Checking Docker containers...")
    try:
        res = subprocess.run(
            ["docker", "compose", "ps", "--services"],
            cwd=superset_root,
            capture_output=True,
            text=True,
            check=True
        )
        services = res.stdout.strip().split()
        if "superset-node" in services or "superset_node" in services:
            node_svc = "superset-node" if "superset-node" in services else "superset_node"
            log_info(f"Found frontend service '{node_svc}'. Restarting container to trigger build...")
            subprocess.run(["docker", "compose", "restart", node_svc], cwd=superset_root, check=True)
            log_success(f"Service '{node_svc}' restarted successfully!")
        else:
            log_info("Running docker compose build for superset-node...")
            subprocess.run(["docker", "compose", "up", "-d", "--build", "superset-node"], cwd=superset_root)
    except Exception as e:
        log_warn(f"Could not automatically restart Docker container: {e}")
        log_info("You can restart the frontend container manually with: docker compose restart superset-node")


def main():
    parser = argparse.ArgumentParser(
        description="Automated installer for Superset Hierarchical Table Chart Plugin"
    )
    parser.add_argument(
        "--superset-path",
        "-s",
        type=str,
        required=True,
        help="Path to the local Apache Superset 6.1.0 repository root"
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Revert all changes and restore backups"
    )
    parser.add_argument(
        "--docker",
        action="store_true",
        default=True,
        help="Attempt to restart Docker compose frontend service"
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

    if args.rollback:
        rollback(superset_root)
        sys.exit(0)

    try:
        frontend_dir = find_superset_frontend(superset_root)
        preset_file = find_main_preset(frontend_dir)

        # 1. Copy plugin files to superset-frontend/plugins/
        rel_path = copy_plugin_files(plugin_root, frontend_dir)

        # 2. Patch package.json
        patch_package_json(frontend_dir, rel_path)

        # 3. Patch MainPreset
        patch_main_preset(preset_file)

        log_success("All frontend files and registrations configured successfully!")

        # 4. Handle Docker if requested
        if args.docker:
            trigger_docker_build(superset_root)

        print("\n" + "=" * 65)
        log_success("INSTALLATION COMPLETED SUCCESSFULLY!")
        print("=" * 65)
        print("To verify in your browser:")
        print("1. Open Superset (http://localhost:8088)")
        print("2. Click '+ -> Chart'")
        print("3. Search for 'Hierarchical Table & Matrix Grid' in the Table category.")
        print("=" * 65 + "\n")

    except Exception as e:
        log_error(f"Installation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
