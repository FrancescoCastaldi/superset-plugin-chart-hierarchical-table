---

## ⚡ Installazione Automatica (Windows & Docker Compose)

Se utilizzi un'istanza di Superset clonata da Git ed eseguita con **Docker Compose** su **Windows** o Linux/macOS, puoi usare gli script automatici pronti all'uso:

### Su Windows (PowerShell):
```powershell
.\scripts\install.ps1 -SupersetPath "C:\path\to\superset"
```

### Su Linux / macOS / Git Bash:
```bash
./scripts/install.sh --superset-path "/path/to/superset"
```

Per la guida completa dettagliata su Windows, consulta [Guida Docker su Windows](docker_installation_windows.md).

---

## 1. Installazione Manuale del Plugin Frontend

### Opzione A: Installazione tramite npm / yarn

All'interno della cartella `superset-frontend/` della tua installazione di Superset:

```bash
cd superset-frontend
npm install --save superset-plugin-chart-hierarchical-table
```

### Opzione B: Link locale per sviluppo

Se stai sviluppando o testando modifiche locali:

```bash
# Nella cartella del plugin frontend
cd packages/superset-plugin-chart-hierarchical-table
npm run build
npm link

# Nella cartella superset-frontend
cd /path/to/superset/superset-frontend
npm link superset-plugin-chart-hierarchical-table
```

---

## 2. Registrazione del Plugin in Superset 6.1.0

Per rendere disponibile il nuovo tipo di chart nella galleria visualizzazioni di Superset:

1. Apri il file `superset-frontend/src/visualizations/presets/MainPreset.js` (oppure `setupPlugins.ts`).
2. Importa la classe del plugin:
   ```javascript
   import { HierarchicalTableChartPlugin } from 'superset-plugin-chart-hierarchical-table';
   ```
3. Aggiungi il plugin all'interno della configurazione dei plugin registrati:

   ```javascript
   new HierarchicalTableChartPlugin().configure({ key: 'hierarchical_table' }).register();
   ```

4. Riavvia il server di sviluppo frontend o ricompila gli asset statici di Superset:
   ```bash
   npm run build
   # oppure per sviluppo attivo
   npm run dev-server
   ```

---

## 3. Installazione del Companion Backend (Opzionale)

Se desideri utilizzare i moduli di post-processing Python o le funzioni di supporto SQL per query ricorsive:

```bash
cd packages/superset-hierarchical-table-backend
pip install -e .
```

---

## 4. Verifica dell'Installazione

1. Accedi ad Apache Superset dal browser.
2. Crea un nuovo Chart (**+ -> Chart**).
3. Seleziona il tuo dataset di test (es. Vendite o Organigramma).
4. Nella galleria grafici cerca **Hierarchical Table & Matrix Grid** (categoria _Table_).
5. Seleziona il grafico e clicca su **Create New Chart**.
