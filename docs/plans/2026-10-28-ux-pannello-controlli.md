# Piano: UX del pannello impostazioni della Hierarchical Table (StratumTree)

Data: 2026-10-28. Stato: DECISIONI D1, D2, D3, D6 prese il 2026-10-28; D4 e D5 su default consigliato (da confermare). In attesa del via per partire dalla Fase 0.
Repository: `03_Sviluppo_Software/Repositories/superset-plugins/superset-plugin-chart-hierarchical-table` (versione di partenza 0.10.4, branch `main`, allineato a GitHub).

## 1. Obiettivo

Rendere il pannello "Explore" del chart comprensibile e guidato: meno voci visibili alla volta, controlli interattivi al posto dei campi JSON e del testo libero, avvisi chiari quando un'opzione non ha effetto. Nessuna rottura per i chart e le dashboard gia salvati.

Criteri di successo misurabili:
- Voci visibili all'apertura del pannello ridotte da circa 60 a 15 o meno (modalita Base).
- Zero campi JSON da modificare a mano per le funzioni ordinarie: i 5 editor JSON diventano editor a righe, con il JSON disponibile solo come vista avanzata.
- Zero cambi di nome o formato delle chiavi di `form_data`: i chart esistenti si aprono identici.
- Suite di test verde, nessuna regressione nei test esistenti (`npm test`).

## 2. Stato attuale (analisi di `src/plugin/controlPanel.tsx`, 1028 righe)

Censimento: 4 sezioni, circa 60 controlli, 24 regole di `visibility`, 11 intestazioni di sottogruppo.

| Sezione | Controlli | Problemi osservati |
|:---|:---:|:---|
| Data | 16 | Gli ordinamenti, i totali e i delta delle colonne pivot (7 voci) stanno in mezzo tra la scelta delle dimensioni e le metriche. `metrics` e l'ultima voce utile, in fondo. |
| Customize | 25 | Una sola pagina lunga con 5 sottogruppi. Due palette distinte (`heatmapPalette`, `themeProfile`) e tre campi hex. Le regole condizionali sono un JSON. |
| Comparison & Analysis | 17 | Contenitore generico: confronto temporale, obiettivi, semantica metriche, calcoli, privacy, sparkline, aggregazione, cross-filter e menu contestuale. Sei argomenti senza legame tra loro. |
| Performance & Limits | 4 | Il JSON `dimensionLimits` e nascosto qui, lontano dalle dimensioni a cui si riferisce. |

Problemi trasversali:

1. **Cinque editor JSON a mano**: `conditionalFormatting`, `goals`, `metricDefinitions`, `tableCalculations`, `dimensionLimits`. Il nome della metrica va digitato a mano. `ArrayControl` ignora in silenzio il JSON non valido (nessun errore visibile) e usa `defaultValue`, quindi non si aggiorna se il valore cambia da fuori.
2. **Testo libero dove serve una scelta**: `suppressionMetrics`, `sparklineMetrics` (liste separate da virgola) e `weightColumn` si scrivono a mano invece di scegliere tra le metriche del chart.
3. **Impostazioni per metrica sparse in 7 punti**: obiettivi, definizioni, calcoli, regole di colore, soppressione, sparkline e peso agiscono tutti sulla singola metrica ma stanno in controlli separati. Questo e il nodo centrale del problema.
4. **Due sistemi di delta sovrapposti**: `showVarianceDelta` con `timeGrain`, `referencePeriod`, `comparisonType` (badge) e `pivotTimeDeltaMode` con `pivotTimeDeltaLag` (colonne). L'utente non capisce quale usare.
5. **Collocazione incoerente**: `emit_filter` ed `enableContextMenu` sono sotto "Advanced Rollup Calculations"; `aggregationMode` sta in "Comparison"; `defaultSortColumn` e `conditionalFormatting` condividono la stessa intestazione.
6. **Opzioni che non fanno nulla senza avvisare**: ad esempio le sparkline richiedono esattamente una colonna pivot, e la regola vive solo nel testo di `description`. Il controllo e attivabile anche quando non puo funzionare.
7. **Etichette miste**: "Pivot Row Totals (Totali Orizzontali di Riga)", emoji nelle scelte di `timeGrain`, descrizioni a meta italiano e inglese. La funzione `t` e un segnaposto che restituisce la stringa invariata.
8. **Ipotesi da verificare in Task 0.3**: `aggregationMode` e `hierarchyType` hanno `renderTrigger: false`. Superset assegna di solito alla scheda Data le sezioni che contengono controlli che richiedono una nuova query. Se e cosi, "Comparison & Analysis" compare nella scheda Data e il resto in Customize, senza che l'utente lo capisca. Da confermare nell'istanza reale prima di progettare.

Vincoli da rispettare (dal codice esistente):
- `test/controlPanelLayout.test.ts` elenca i nomi dei controlli di riferimento (`BASELINE_CONTROL_NAMES`): nessun controllo puo sparire o cambiare nome.
- `src/plugin/formDataOptions.ts` legge le chiavi `goals`, `metricDefinitions`, `tableCalculations` e relativi alias. I nuovi editor devono scrivere esattamente quelle chiavi, con lo stesso formato.
- `dev-studio/` e un ambiente Vite per provare il chart senza Superset: va verificato se mostra anche il pannello.

## 3. Soluzione proposta

### 3.1 Nuova architettura dell'informazione

Le sezioni diventano argomenti. Nessun nome di controllo cambia, cambia solo dove stanno.

| Scheda | Sezione nuova | Contenuto (nomi dei controlli esistenti) | Aperta di default |
|:---|:---|:---|:---:|
| Data | 1. Struttura della gerarchia | `hierarchyType`, `groupby`, `idColumn`, `parentIdColumn`, `labelColumn` | si |
| Data | 2. Metriche | `metrics`, `aggregationMode`, `weightColumn`, nuovo pannello "Impostazioni per metrica" | si |
| Data | 3. Colonne pivot | `columns`, `combineMetric`, `pivotSortOrder`, `pivotRowTotalsPosition`, `pivotRowTotalsLabel`, `showPivotColumnSubtotals`, `pivotColumnSubtotalLabel` | solo se `columns` valorizzato |
| Data | 4. Filtri e limiti | `adhoc_filters`, `row_limit`, `dimensionLimits` (editor a righe) | no |
| Customize | 5. Albero e navigazione | `initialExpandDepth`, `valueDisplayMode`, `showSubtotals`, `showGrandTotal`, `enableSearch`, `enableHierarchicalSort`, `stickyHeader`, `enableExport` | si |
| Customize | 6. Ordinamento | `defaultSortColumn`, `defaultSortOrder`, `nullHandling` | no |
| Customize | 7. Evidenziazione valori | `minMaxDisplayMode`, `minMaxScope`, `heatmapPalette`, `divergingMidpoint`, `conditionalFormatting` (editor a righe) | no |
| Customize | 8. Formato e tema | `numberFormat`, `currencySymbol`, `stripedRows`, `compactMode`, `themeProfile`, tre colori custom | no |
| Customize | 9. Confronto nel tempo | `showVarianceDelta`, `timeGrain`, `referencePeriod`, `comparisonType`, `pivotTimeDeltaMode`, `pivotTimeDeltaLag` | no |
| Customize | 10. Obiettivi, definizioni e calcoli | `goals`, `metricDefinitions`, `tableCalculations` (editor a righe) | no |
| Customize | 11. Privacy dati piccoli | `suppressionThreshold`, `suppressionMetrics`, `complementarySuppression`, `suppressionLabel` | no |
| Customize | 12. Trend e interazioni | `showSparklines`, `sparklineMetrics`, `emit_filter`, `enableContextMenu` | no |
| Customize | 13. Prestazioni | `pageSize`, `virtualizationThreshold` | no |

Nota: `pivotTimeDeltaMode` e `pivotTimeDeltaLag` si spostano nel gruppo "Confronto nel tempo" accanto ai badge delta, senza fonderli (vedi decisione D4).

### 3.2 Modalita Base e Avanzata

Un solo selettore in testa al pannello, "Livello impostazioni: Base / Avanzato", solo grafico (non influisce sul rendering). In Base restano visibili 12-15 controlli essenziali; il resto compare in Avanzato tramite le regole `visibility` gia in uso. Se un chart ha gia valorizzato un'opzione avanzata, quella resta visibile in ogni caso, per non nascondere impostazioni attive.

### 3.3 Editor interattivi al posto del JSON

Un componente base `RuleListEditor` (righe con aggiungi, rimuovi, riordina) e quattro specializzazioni. La scelta della metrica e sempre un menu a tendina alimentato da `mapStateToProps` con le metriche selezionate.

| Controllo | Editor | Campi della riga |
|:---|:---|:---|
| `conditionalFormatting` | Regole colore | metrica, operatore (`<` `<=` `==` `>=` `>` `between` `regex`), valore (e secondo valore per `between`), ambito (cella, riga, colonna), priorita |
| `goals` | Obiettivi | metrica, target, direzione (piu alto e meglio / piu basso e meglio) |
| `metricDefinitions` | Definizioni | metrica, tipo, parametri del tipo (numeratore e denominatore per `ratio`, ecc.), formato, decimali, polarita |
| `tableCalculations` | Calcoli di tabella | metrica, tipo, modo di visualizzazione |
| `dimensionLimits` | Limiti per livello | livello o dimensione, N, metrica, top o bottom, etichetta "Altri" |

Ogni editor ha: validazione per riga con messaggio visibile, anteprima in lingua naturale della regola ("Evidenzia in verde `fatturato` quando e maggiore di 100"), pulsante "Vedi/modifica JSON" bidirezionale per gli utenti esperti, e salva sempre nel formato attuale.

Selettori di metriche (`MetricMultiSelect`) per `suppressionMetrics` e `sparklineMetrics`, selettore singolo per `weightColumn`. Il valore salvato resta la stringa separata da virgola.

### 3.4 Pannello "Impostazioni per metrica" (opzionale, fase 4)

Una tabella con una riga per metrica selezionata e colonne Formato, Obiettivo, Polarita, Sparkline, Soppressione, Peso. Legge e scrive le stesse chiavi degli editor del punto 3.3, quindi non introduce nuovi dati. Dipende dalla decisione D3.

### 3.5 Guida contestuale

- Avvisi inline (riga React, come gia fatto per `subsectionHeader`) quando una funzione non puo agire: "Le sparkline richiedono esattamente una colonna pivot: ora ne hai 0."
- Controlli dipendenti mostrati con spiegazione, invece di sparire, dove l'assenza confonde (ad esempio `weightColumn`).
- Descrizioni brevi e a una riga; il dettaglio passa in un'icona informativa.

### 3.6 Etichette

Una sola lingua per tutte le etichette (decisione D2), niente emoji, nomi brevi. Il segnaposto `t` va collegato al sistema di traduzione di Superset solo se la decisione D2 lo richiede.

## 4. Pre-Flight e Compliance (da spuntare prima di iniziare)

- [x] Letti `D:\Actual\AGENTS.md`, `03_Sviluppo_Software/AGENTS.md`, `codemap.md` del plugin.
- [x] Nessuna credenziale necessaria: il vault non serve per questo lavoro. Nessun accesso a istanze Superset di produzione o di altri progetti.
- [x] Nessun dato sanitario reale: i test usano solo fixture sintetiche.
- [ ] Working tree del plugin pulito prima di partire (`git status --porcelain` vuoto) oppure worktree dedicato `git worktree add ../wt-ux-controlli main`.
- [ ] Licenza: repository personale su GitHub, stato DCO. Commit con `git commit -s`, autore Francesco Castaldi, nessun trailer di strumenti AI.
- [ ] Testo e commit senza em-dash, en-dash o doppi trattini; file in UTF-8 senza BOM.
- [ ] Aggiornare `CHANGELOG.md` (Keep a Changelog 1.1.0) e la versione in `package.json` (SemVer).

## 5. Matrice di rischio

| Rischio | Impatto | Mitigazione |
|:---|:---|:---|
| Un chart salvato cambia aspetto o si rompe | Alto | Chiavi `form_data` invariate; test di caratterizzazione prima di toccare; confronto del `form_data` prima e dopo su un chart reale. |
| Un controllo viene perso nel riordino | Alto | `BASELINE_CONTROL_NAMES` verifica che ogni nome sia ancora presente una sola volta. |
| Le API dei controlli custom cambiano tra versioni di Superset | Medio | Decisione D1 sulla versione minima; test sulla istanza di sviluppo reale in Task 0.3 e in ogni fase. |
| Il test dei componenti React non e possibile (manca jsdom o Testing Library) | Medio | Logica di parsing, validazione e serializzazione in funzioni pure testate a parte; componenti sottili. Verifica in Task 0.2. |
| `StratumTreeInstallerGUI.exe` e `dist/` bloccati da processi attivi | Basso | Chiudere Superset locale prima di ricostruire; non committare `dist/`. |
| Lo stesso codice esiste come mirror in `superset-extensions` | Medio | Dopo il rilascio, aggiornare il mirror in un passaggio separato e verificato. |

Shell: PowerShell 5.1, concatenare con `;` e non con `&&`.

## 6. Task (ciclo TDD, ognuno da 2-5 minuti)

Convenzione: percorsi relativi alla radice del plugin. Comando test singolo: `npm test -- test/<file>.test.ts`. Comando suite completa: `npm test`. Messaggi di commit in Conventional Commits, con `git commit -s`.

### Fase 0: Rete di sicurezza (nessuna modifica funzionale)

**Task 0.1: Esportare lo snapshot dei controlli attuali.**
- File: `test/controlPanelLayout.test.ts`. Aggiungere un test che salva (con `toMatchSnapshot`) la lista `[sezione, nome controllo]` in ordine.
- Atteso: `npm test -- test/controlPanelLayout.test.ts` passa e crea lo snapshot.
- Commit: `test(control-panel): snapshot current control order before UX refactor`.

**Task 0.2: Verificare l'ambiente di test dei componenti.**
- Controllare in `package.json` e `jest.config.js` la presenza di `jsdom`, `@testing-library/react`. Registrare l'esito in `docs/plans/` (una riga).
- Se mancano: decidere con l'utente se aggiungerli come `devDependencies` (decisione D5).
- Nessun commit se non si aggiunge nulla.

**Task 0.3: Verificare in Superset reale in quale scheda finisce ogni sezione.**
- Aprire un chart di prova nell'istanza di sviluppo locale e annotare, per ogni sezione attuale, se compare in Data o Customize. Confermare o smentire l'ipotesi del punto 8 della sezione 2.
- Esito scritto in questo file, sezione 10.
- Nessun commit di codice.

**Task 0.4: Fotografare un `form_data` reale come riferimento di compatibilita.**
- Salvare in `test/fixtures/formdata-reference.json` un `form_data` sintetico che usa tutte le chiavi dei 5 editor (nessun dato reale).
- Test: `normalizeFormDataOptions` (o la funzione usata in `formDataOptions.ts`) produce l'output atteso; lo snapshot deve restare invariato per tutto il lavoro.
- Commit: `test(form-data): add reference fixture covering all editor keys`.

### Fase 1: Riorganizzazione (solo spostamenti e rinomine di etichette)

**Task 1.1: Estrarre helper di sezione.** Creare `src/plugin/controlSections.ts` con funzioni `section(label, rows, options)` per ridurre la ripetizione; nessun cambio di comportamento. Test: lo snapshot del Task 0.1 resta identico.

**Task 1.2: Spostare le 13 sezioni della tabella 3.1.** Riordinare in `controlPanel.tsx`. Test fallente: nuovo test in `controlPanelLayout.test.ts` che verifica i titoli delle 13 sezioni e che ogni nome di `BASELINE_CONTROL_NAMES` compaia una sola volta. Verifica: passa dopo lo spostamento; lo snapshot dell'ordine cambia e viene aggiornato consapevolmente. Commit: `refactor(control-panel): regroup controls into 13 topic sections`.

**Task 1.3: Indicare la scheda di destinazione.** Aggiungere `tabOverride: 'data'` o `'customize'` alle sezioni, per non dipendere dall'euristica di Superset (esito del Task 0.3). Test: ogni sezione ha `tabOverride` coerente con la tabella 3.1. Commit: `fix(control-panel): pin sections to Data or Customize tab`.

**Task 1.4: Uniformare etichette e descrizioni.** Applicare la decisione D2 (una lingua, niente emoji, descrizioni a una riga). Test: nessuna etichetta contiene `(` seguita da testo in altra lingua; nessuna contiene emoji (espressione regolare). Commit: `chore(control-panel): unify labels language and remove emoji`.

### Fase 2: Modalita Base/Avanzata e guida contestuale

**Task 2.1: Controllo `settingsLevel`.** Nuovo controllo di tipo `RadioButtonControl` o `SelectControl`, `renderTrigger: true`, default `basic`, definito in cima alla scheda Data. Test fallente: il controllo esiste, e il default e `basic`. Commit: `feat(control-panel): add basic/advanced settings level toggle`.

**Task 2.2: Funzione pura `isAdvancedVisible`.** In `src/plugin/controlVisibility.ts`: restituisce vero se il livello e `advanced` oppure se il controllo ha un valore diverso dal default. Test: quattro casi (basic senza valore, basic con valore, advanced, controllo sconosciuto). Commit: `feat(control-panel): add advanced-visibility rule`.

**Task 2.3: Applicare la regola ai controlli avanzati.** Elenco dei controlli base e avanzati da approvare (decisione D3). Test: in modalita basic il numero di controlli visibili e minore o uguale a 15 con un `form_data` vuoto. Commit: `feat(control-panel): hide advanced controls in basic mode`.

**Task 2.4: Riga di avviso riusabile.** `src/plugin/controls/InlineHint.tsx`, con tono `info` o `warning`. Test sulla funzione pura che decide il testo (ad esempio `sparklineHint(columns)`). Commit: `feat(control-panel): add contextual inline hints`.

**Task 2.5: Avvisi di prerequisito.** Sparkline (serve una sola colonna pivot), soppressione (soglia a 0 significa disattivata), peso (serve `aggregationMode` uguale a `weighted_avg`), confronto temporale (serve colonna pivot o badge). Test: una funzione pura per ciascun avviso. Commit: `feat(control-panel): warn when an option has no effect`.

### Fase 3: Editor interattivi

**Task 3.1: Libreria pura `jsonList`.** `src/plugin/controls/jsonList.ts` con `parseList(text)`, `serializeList(rows)`, `validateRow(kind, row)`. Test fallente per ogni funzione, inclusi testo vuoto, JSON non valido, array con elementi non oggetto. Commit: `feat(controls): add pure parse/serialize helpers for rule lists`.

**Task 3.2: Selettore di metriche.** `MetricMultiSelect.tsx`, alimentato da `mapStateToProps` (stessa logica che gia legge `controls.metrics`). Il valore resta la stringa separata da virgola. Test: la funzione pura di conversione stringa e array in entrambi i sensi, con spazi e voci duplicate. Collegare a `suppressionMetrics`, `sparklineMetrics`, `weightColumn`. Commit: `feat(control-panel): pick suppression and sparkline metrics from a list`.

**Task 3.3: `RuleListEditor` generico.** Righe con aggiungi, rimuovi, riordina (riusare `reorderArray` da `src/utils/metricReorder.ts`). Test: aggiunta, rimozione e riordino sulle funzioni pure. Commit: `feat(controls): add generic rule list editor`.

**Task 3.4: Editor obiettivi (`goals`).** Il piu semplice, serve da modello. Test: un giro completo righe -> JSON -> `normalizeGoals` restituisce gli stessi obiettivi. Commit: `feat(control-panel): interactive editor for metric goals`.

**Task 3.5: Editor regole colore (`conditionalFormatting`).** Sostituisce `ArrayControl`. Test: operatore `between` richiede il secondo valore; la priorita e un numero intero positivo; round trip con `normalizeConditionalRules` (o funzione equivalente in `src/utils/conditionalFormatting.ts`). Commit: `feat(control-panel): interactive editor for conditional formatting rules`.

**Task 3.6: Editor definizioni metrica (`metricDefinitions`).** Campi dipendenti dal tipo (`ratio` mostra numeratore, denominatore, scala). Test: un test per tipo (`sum`, `mean`, `distinct_count`, `ratio`, `delta_pct`, `diff`, `none`) con round trip su `normalizeMetricDefinitions`. Commit: `feat(control-panel): interactive editor for metric definitions`.

**Task 3.7: Editor calcoli di tabella (`tableCalculations`).** Test con i 6 tipi (`pct_of_total`, `pct_of_parent`, `running_total`, `diff_from_previous`, `diff_from_previous_pct`, `rank`) e round trip su `normalizeTableCalculations`. Commit: `feat(control-panel): interactive editor for table calculations`.

**Task 3.8: Editor limiti dimensione (`dimensionLimits`).** Test: round trip su `src/utils/dimensionLimits.ts`. Spostarlo in "Filtri e limiti". Commit: `feat(control-panel): interactive editor for dimension limits`.

**Task 3.9: Vista JSON bidirezionale.** Interruttore per passare dall'editor al JSON e ritorno, con errore visibile se il testo non e valido (a differenza di `ArrayControl`). Test: JSON non valido produce un messaggio e non sovrascrive il valore salvato. Commit: `feat(controls): add validated raw JSON view to every editor`.

### Fase 4: Impostazioni per metrica (approvata, decisione D3)

**Task 4.1: Modello dati di vista.** Funzione pura `buildMetricSettings(formData)` che unisce, per ogni metrica, obiettivo, definizione, calcoli, regole colore, soppressione, sparkline e peso. Test su un `form_data` sintetico.
**Task 4.2: Funzione inversa.** `applyMetricSettings(formData, metricSettings)` che riscrive le sette chiavi. Test: `apply(build(x))` e uguale a `x` (round trip senza perdita).
**Task 4.3: Componente tabella per metrica.** Una riga per metrica con le colonne di sintesi e un pulsante per aprire i dettagli. Commit: `feat(control-panel): per-metric settings table`.

### Fase 5: Verifica, rilascio, allineamento

**Task 5.1: Prova nell'istanza di sviluppo.** Costruire (`npm run build`), installare il plugin (`install-plugin.ps1`) e passare in rassegna le 13 sezioni in modalita Base e Avanzata, con un chart nuovo e con un chart salvato con la versione 0.10.4. Annotare gli esiti nella sezione 10.
**Task 5.2: Aggiornare documentazione.** `README.md`, `docs/` e `codemap.md` del plugin (nuova struttura delle sezioni e cartella `src/plugin/controls/`).
**Task 5.3: Versione e changelog.** Salire a `0.11.0` in `package.json`; voce `Added`/`Changed` in `CHANGELOG.md` (Keep a Changelog 1.1.0). Commit: `chore(release): v0.11.0 control panel UX overhaul`.
**Task 5.4: Push.** Su GitHub (`origin`, `main`). Nessun force. Il repo standalone non e su Bitbucket (decisione D6): ci arriva solo tramite il mirror del Task 5.5.
**Task 5.5: Mirror.** Aggiornare la copia in `superset-extensions/plugins/superset-plugin-chart-hierarchical-table` (oggi ferma alla 0.10.0, mentre il sorgente e alla 0.10.4), mostrando il diff prima del commit, poi push su Bitbucket `main` senza force.

## 7. Collaudo finale (Evidence Gate)

- `npm test` verde al 100%, incluso lo snapshot di compatibilita del Task 0.4.
- `npm run lint` senza errori nuovi.
- `npm run build` completato.
- Controllo manuale in Superset: un chart creato con la 0.10.4 si apre con lo stesso aspetto e gli stessi valori; un chart nuovo si configura completamente senza digitare JSON.
- Conteggio dei controlli visibili in modalita Base: 15 o meno.

## 8. Rollback

- Lavoro su un branch dedicato (`feat/ux-control-panel`), `main` resta intatto fino al rilascio.
- Se si interrompe a meta: `git stash` oppure, con working tree da scartare e solo dopo conferma, `git checkout -- .`. Nessun `git clean` senza prima elencare i file.
- Dopo un rilascio problematico: ripristinare la 0.10.4 con `git revert` dei commit del branch, senza riscrivere la storia pubblicata.
- Nei chart gia salvati non c'e nulla da migrare, perche le chiavi non cambiano.

## 9. Decisioni aperte

| Id | Domanda | Default consigliato |
|:---|:---|:---|
| Id | Domanda | Decisione |
|:---|:---|:---|
| D1 | Versione di Superset di riferimento | DECISA: 6.1.0 (istanza di prova). Il README dichiara 3.x fino a 6.x: i componenti custom vanno provati su 6.1.0 e controllati sulla API 3.x prima del rilascio. |
| D2 | Lingua delle etichette | DECISA: italiano ovunque, niente emoji, niente doppia lingua tra parentesi. |
| D3 | Ambito del rilascio 0.11.0 | DECISA: tutto, fasi 1-5 compresa la tabella "Impostazioni per metrica". Resta da approvare l'elenco dei controlli visibili in modalita Base (vedi Task 2.3). |
| D4 | Delta: badge e colonne pivot restano separati o si unificano? | DEFAULT, da confermare: separati con avviso su quale usare. Unificazione solo dopo verifica dei chart in uso. |
| D5 | Aggiungere `jsdom` e `@testing-library/react` come `devDependencies`? | DEFAULT, da confermare: si, solo dipendenze di sviluppo. |
| D6 | Dove pubblicare | DECISA: GitHub (`origin`, `main`) e aggiornamento del mirror in `superset-extensions` (che va anche su Bitbucket). Nessun repo Bitbucket dedicato. |

## 10. Registro dei risultati (da compilare durante l'esecuzione)

- Task 0.2 (ambiente di test componenti): da fare.
- Task 0.3 (scheda di destinazione delle sezioni in Superset): da fare.
- Task 5.1 (prova finale): da fare.
