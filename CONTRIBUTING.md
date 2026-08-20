# Linee Guida per Contribuire

Grazie per il tuo interesse nel contribuire a **Apache Superset Hierarchical Table Chart Plugin**!

---

## 🛠️ Ambiente di Sviluppo

### Prerequisiti
- **Node.js**: versione `>= 18` (LTS raccomandata: `v20.x`)
- **npm** o **yarn**
- **Python**: versione `>= 3.9`
- **Git**

### Configurazione Iniziale
1. Clona il repository:
   ```bash
   git clone https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table.git
   cd superset-plugin-chart-hierarchical-table
   ```
2. Installa le dipendenze frontend:
   ```bash
   cd frontend
   npm install
   ```
3. Installa le dipendenze backend in un virtualenv:
   ```bash
   cd ../backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e ".[dev]"
   ```

---

## 🧪 Esecuzione dei Test e Linting

### Frontend
```bash
cd frontend
npm run lint      # Verifica stile codice e TypeScript
npm test          # Esegue i test unitari Jest / Vitest
npm run build     # Compila il bundle del plugin
```

### Backend
```bash
cd backend
pytest tests/ -v  # Esegue i test unitari con pytest
flake8 .          # Linting Python
mypy .            # Type checking con MyPy
```

---

## 🌿 Flusso di Lavoro Git & Branching

1. Crea un branch descrittivo per la tua modifica:
   - `feature/nome-feature`
   - `fix/descrizione-bug`
   - `docs/aggiornamento-documentazione`
2. Effettua commit con messaggi chiari (convenzione [Conventional Commits](https://www.conventionalcommits.org/)):
   - `feat(frontend): add sticky first column support`
   - `fix(backend): correct subtotal calculation for null parent nodes`
   - `docs: update installation steps for Superset 6.1.0`
3. Assicurati che tutti i test e i controlli di linting passino prima di aprire una Pull Request.
4. Apri una Pull Request descrivendo nel dettaglio il problema risolto o la funzionalità aggiunta.
