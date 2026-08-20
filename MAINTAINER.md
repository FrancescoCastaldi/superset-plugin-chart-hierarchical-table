# Maintainer & Development Guide

> **Nota di Riservatezza / Proprietà**:
> Questo repository è mantenuto esclusivamente dall'autore (**Francesco Castaldi**). Non vengono accettate Pull Request o contributi esterni da parte di terzi.

---

## 🛠️ Workflow di Sviluppo Locale

### 1. Prerequisiti
- **Node.js**: `>= 20.x LTS`
- **npm**
- **Python**: `>= 3.9`
- **Docker Desktop** (con WSL 2 su Windows)

### 2. Setup Iniziale del Workspace
Dalla radice del monorepo:

```bash
make install
```
oppure manualmente:
```bash
npm install
cd packages/superset-hierarchical-table-backend && pip install -e ".[dev]"
```

---

## 🧪 Esecuzione Test & Lint

```bash
# Esegue tutti i test (Frontend TS + Backend Python)
make test

# Compila tutti i pacchetti frontend
make build

# Verifica formattazione e linting
make lint
npm run format
```

---

## 🚀 Installazione e Test Rapido su Superset Locale

Per iniettare direttamente le modifiche nel tuo Superset locale (Docker o dev mode):

### Su Windows (PowerShell):
```powershell
.\scripts\install.ps1 -SupersetPath "C:\Users\TuoNome\superset"
```

### Su Linux / macOS / Git Bash:
```bash
make install-superset SUPERSET_PATH=/path/to/superset
```

---

## 🌐 Deployment GitHub Pages & Sandbox

Il sito di documentazione, roadmap e simulatore interattivo della dashboard viene pubblicato automaticamente su GitHub Pages ad ogni push su `main` tramite `.github/workflows/deploy-pages.yml`.

Per sincronizzare manualmente o forzare il deploy del branch `gh-pages`:
```bash
git subtree split --prefix site -b gh-pages
git push origin gh-pages -f
git branch -D gh-pages
```

URL del sito pubblico: **https://francescocastaldi.github.io/superset-plugin-chart-hierarchical-table/**

---

## 📦 Rilascio e Tagging

1. Aggiorna `CHANGELOG.md` con le nuove feature o bug fix.
2. Incrementa la versione in `packages/superset-plugin-chart-hierarchical-table/package.json` e `packages/superset-hierarchical-table-backend/pyproject.toml`.
3. Esegui il commit e crea il tag git:
   ```bash
   git tag -a v0.1.1 -m "Release v0.1.1"
   git push origin main --tags
   ```
