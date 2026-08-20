# Guida all'Installazione Automatica su Windows con Docker Compose (Superset 6.1.0)

Questa guida spiega passo-passo come installare il plugin **Hierarchical Table** in un'istanza di **Apache Superset 6.1.0** già esistente su un computer **Windows**, clonata da Git ed eseguita tramite **Docker Compose** (`docker compose up` o `docker compose -f docker-compose-non-dev.yml up`).

---

## 🎯 Scenario di Riferimento

- **Sistema Operativo**: Windows 10 / 11 con **Docker Desktop** (backend WSL 2).
- **Repository Superset**: Repository ufficiale `apache/superset` clonato su una cartella locale (es. `C:\Users\TuoNome\superset`), su cui è stato eseguito:
  ```powershell
  git checkout 6.1.0
  ```
- **Repository Plugin**: Questo repository (`superset-plugin-chart-hierarchical-table`) clonato localmente.

---

## ⚡ Metodo 1: Installazione Automatica con PowerShell (Consigliato)

Abbiamo creato uno script PowerShell che automatizza l'intero processo di copia, configurazione di `package.json`, iniezione in `MainPreset.js` e riavvio del container.

### 1. Apri PowerShell come Utente o Amministratore

Naviga nella cartella di questo plugin:

```powershell
cd C:\Users\TuoNome\Documents\superset-plugin-chart-hierarchical-table
```

### 2. Esegui lo Script di Installazione

Passa il percorso della cartella dove hai clonato Apache Superset:

```powershell
.\scripts\install.ps1 -SupersetPath "C:\Users\TuoNome\superset"
```

> **Nota**: Se non specifichi `-SupersetPath`, lo script ti chiederà interattivamente di inserire il percorso.

### 3. Cosa fa lo Script in Automatico:

1. Crea un backup di sicurezza (`.bak`) di `package.json` e `MainPreset.js`.
2. Copia i sorgenti del plugin in `superset-frontend/plugins/superset-plugin-chart-hierarchical-table`.
3. Aggiunge la dipendenza locale in `superset-frontend/package.json`.
4. Inserisce l'import e la registrazione in `superset-frontend/src/visualizations/presets/MainPreset.js`.
5. Rileva i container Docker attivi e riavvia automaticamente il servizio `superset-node` (o `superset_node`).

---

## 🐳 Metodo 2: Esecuzione con Docker Compose in Dettaglio

A seconda di come avvii Superset sul tuo PC Windows, ecco come gestire i container:

### Caso A: Modalità Sviluppo (`docker compose up`)

In questa modalità, il container `superset-node` compila il frontend in tempo reale con Webpack watch:

1. Esegui l'installer:
   ```powershell
   .\scripts\install.ps1 -SupersetPath "C:\Users\TuoNome\superset"
   ```
2. Riavvia il container frontend per fargli rilevare il nuovo pacchetto:
   ```powershell
   cd C:\Users\TuoNome\superset
   docker compose restart superset-node
   ```
3. Segui i log per verificare la ricompilazione:
   ```powershell
   docker compose logs -f superset-node
   ```

---

### Caso B: Modalità Non-Dev (`docker compose -f docker-compose-non-dev.yml up`)

In modalità non-dev, Superset utilizza file statici pre-compilati. Per inserire il plugin:

1. Esegui l'installer:
   ```powershell
   .\scripts\install.ps1 -SupersetPath "C:\Users\TuoNome\superset" -NoDocker
   ```
2. Esegui un build rapido degli asset frontend all'interno del container o localmente:
   ```powershell
   cd C:\Users\TuoNome\superset\superset-frontend
   npm install
   npm run build
   ```
3. Riavvia l'applicazione:
   ```powershell
   cd ..
   docker compose -f docker-compose-non-dev.yml restart superset
   ```

---

## 🔄 Come Ripristinare lo Stato Originale (Rollback)

Se per qualsiasi motivo vuoi disinstallare il chart e ripristinare i file originali di Superset:

```powershell
.\scripts\install.ps1 -SupersetPath "C:\Users\TuoNome\superset" -Rollback
```

Lo script eliminerà la cartella del plugin da `plugins/` e ripristinerà i file di backup `MainPreset.js.bak` e `package.json.bak`.

---

## ✅ Verifica dell'Installazione in Superset

1. Apri il browser all'indirizzo **`http://localhost:8088`**.
2. Esegui il login (credenziali predefinite: `admin` / `admin`).
3. Clicca sul pulsante in alto a destra **`+ -> Chart`**.
4. Seleziona uno dei dataset disponibili (oppure carica uno dei file CSV presenti nella cartella `examples/` di questo plugin).
5. Nella finestra modale di scelta del tipo di grafico:
   - Cerca **`Hierarchical Table`** oppure filtra per la categoria **`Table`**.
   - Seleziona **`Hierarchical Table & Matrix Grid`**.
6. Clicca su **`Create New Chart`**: ora puoi trascinare le dimensioni gerarchiche e le metriche!

---

## 🛠️ Risoluzione dei Problemi Comuni su Windows

### 1. Errore "Execution Policy" in PowerShell

Se PowerShell blocca l'esecuzione dello script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\install.ps1 -SupersetPath "C:\Users\TuoNome\superset"
```

### 2. Hot-Reload di Docker non rileva le modifiche su Windows

Assicurati che Docker Desktop abbia abilitato l'integrazione con WSL 2 (**Settings -> Resources -> WSL Integration**) e che il progetto risieda all'interno del filesystem di Windows o WSL.

### 3. La cache del browser mostra ancora la vecchia lista dei grafici

Esegui un hard refresh nel browser con **`Ctrl + F5`** o apri una finestra in incognito per pulire la cache dei bundle JavaScript.
