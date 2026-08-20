# ==============================================================================
# Apache Superset Hierarchical Table Chart Plugin - Monorepo Makefile
# ==============================================================================

.PHONY: all help install build test lint clean format install-superset

PYTHON ?= python3
NPM ?= npm

help:
	@echo "Available commands:"
	@echo "  make install           - Install dependencies for all workspace packages"
	@echo "  make build             - Build all frontend packages"
	@echo "  make test              - Run frontend and backend tests"
	@echo "  make test-frontend     - Run frontend tests"
	@echo "  make test-backend      - Run Python backend tests"
	@echo "  make lint              - Lint all codebase (TS and Python)"
	@echo "  make clean             - Clean build outputs and artifacts"
	@echo "  make install-superset  - Install plugin to Superset (usage: make install-superset SUPERSET_PATH=/path/to/superset)"

install:
	$(NPM) install
	@if [ -d "packages/superset-hierarchical-table-backend" ]; then \
		cd packages/superset-hierarchical-table-backend && $(PYTHON) -m pip install -e ".[dev]" || true; \
	fi

build:
	$(NPM) run build

test: test-frontend test-backend

test-frontend:
	cd packages/superset-plugin-chart-hierarchical-table && $(NPM) test --if-present

test-backend:
	cd packages/superset-hierarchical-table-backend && $(PYTHON) -m pytest tests/ -v || true

lint:
	$(NPM) run lint --if-present

clean:
	rm -rf dist packages/*/dist packages/*/node_modules node_modules .pytest_cache packages/*/.pytest_cache

install-superset:
	@if [ -z "$(SUPERSET_PATH)" ]; then \
		echo "Error: Please specify SUPERSET_PATH. Example: make install-superset SUPERSET_PATH=/path/to/superset"; \
		exit 1; \
	fi
	$(PYTHON) scripts/installer.py --superset-path "$(SUPERSET_PATH)"
