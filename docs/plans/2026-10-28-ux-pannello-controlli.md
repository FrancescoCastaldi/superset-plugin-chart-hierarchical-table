# Piano: UX del pannello impostazioni della Hierarchical Table (StratumTree)

Data: 2026-10-28. Stato: Fase 0 completata (sezione 10). Decisioni D1, D2, D3, D6 prese; D4 e D5 su default consigliato (da confermare); D7 aperta. Prossimo passo: Fase 1.
Repository: `03_Sviluppo_Software/Repositories/superset-plugins/superset-plugin-chart-hierarchical-table` (versione di partenza 0.10.4, lavoro sul branch `feat/ux-control-panel`, creato da `main` allineato a GitHub).

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
8. **Schede Data e Customize (CONFERMATO dal codice di Superset 6.1.0, Task 0.3)**: la regola di `ControlPanelsContainer.tsx` manda una sezione nella scheda Data se ha `tabOverride: 'data'` oppure anche un solo controllo oggetto con `renderTrigger` falso o assente. Tutte le altre vanno in Customize. Esiste solo `tabOverride: 'data'` (e `'matrixify'`), non `'customize'`. I controlli dichiarati come stringa (`'row_limit'`, `'adhoc_filters'`) non contano nella regola. Effetto oggi: "Comparison & Analysis" compare nella scheda **Data** perche contiene `aggregationMode` (`renderTrigger: false`), mentre "Performance & Limits", con `row_limit`, compare in **Customize**. Il limite righe della query sta quindi nella scheda sbagliata.

Vincoli da rispettare (dal codice esistente):
- `test/controlPanelLayout.test.ts` elenca i nomi dei controlli di riferimento (`BASELINE_CONTROL_NAMES`): nessun controllo puo sparire o cambiare nome.
- `src/plugin/formDataOptions.ts` legge le chiavi `goals`, `metricDefinitions`, `tableCalculations` e relativi alias. I nuovi editor devono scrivere esattamente quelle chiavi, con lo stesso formato.
- `dev-studio/` e un ambiente Vite per provare il chart senza Superset: va verificato se mostra anche il pannello.

## 3. Soluzione proposta

### 3.1 Nuova architettura dell'informazione

Le sezioni diventano argomenti. Nessun nome di controllo cambia, cambia solo dove stanno.

| Scheda | Sezione nuova | Contenuto (nomi dei controlli esistenti) | Aperta di default |
|:---|:---|:---|:---:|
| Data | 1. Struttura della gerarchia | `hierarchyType`, `groupby`, `columns`, `idColumn`, `parentIdColumn`, `labelColumn` | si |
| Data | 2. Metriche | `metrics`, `aggregationMode`, `weightColumn`, nuovo pannello "Impostazioni per metrica" | si |
| Data | 3. Opzioni delle colonne pivot | `combineMetric`, `pivotSortOrder`, `pivotRowTotalsPosition`, `pivotRowTotalsLabel`, `showPivotColumnSubtotals`, `pivotColumnSubtotalLabel` | no, e nascosta finche non si scelgono colonne pivot (regola `visibility` di sezione) |
| Data | 4. Filtri e limiti | `adhoc_filters`, `row_limit`, `dimensionLimits` (editor a righe) | no |
| Customize | 5. Albero e navigazione | `initialExpandDepth`, `valueDisplayMode`, `showSubtotals`, `showGrandTotal`, `enableSearch`, `enableHierarchicalSort`, `stickyHeader`, `enableExport` | si |
| Customize | 6. Ordinamento | `defaultSortColumn`, `defaultSortOrder`, `nullHandling` | no |
| Customize | 7. Evidenziazione dei valori | `minMaxDisplayMode`, `minMaxScope`, `heatmapPalette`, `divergingMidpoint`, `conditionalFormatting` (editor a righe) | no |
| Customize | 8. Formato e tema | `numberFormat`, `currencySymbol`, `stripedRows`, `compactMode`, `themeProfile`, tre colori custom | no |
| Customize | 9. Confronto nel tempo | `showVarianceDelta`, `timeGrain`, `referencePeriod`, `comparisonType`, `pivotTimeDeltaMode`, `pivotTimeDeltaLag` | no |
| Customize | 10. Obiettivi, definizioni e calcoli | `goals`, `metricDefinitions`, `tableCalculations` (editor a righe) | no |
| Customize | 11. Privacy sui piccoli numeri | `suppressionThreshold`, `suppressionMetrics`, `complementarySuppression`, `suppressionLabel` | no |
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

**Task 1.1: Estrarre helper di sezione. NON ESEGUITO.** Le 13 sezioni sono letterali omogenei e un helper `section()` non avrebbe ridotto la complessita; l'unica ripetizione reale (la condizione "ci sono colonne pivot", 8 volte) e stata risolta con `hasPivotColumns` nel Task 1.2b.

**Task 1.2: Spostare le 13 sezioni della tabella 3.1.** Riordinare in `controlPanel.tsx`. Test fallente: nuovo test in `controlPanelLayout.test.ts` che verifica i titoli delle 13 sezioni e che ogni nome di `BASELINE_CONTROL_NAMES` compaia una sola volta. Verifica: passa dopo lo spostamento; lo snapshot dell'ordine cambia e viene aggiornato consapevolmente. Commit: `refactor(control-panel): regroup controls into 13 topic sections`.

**Task 1.3: Fissare la scheda di destinazione.** In Superset 6.1.0 si forza solo la scheda Data. Quindi: `tabOverride: 'data'` sulle sezioni 1, 2, 3 e 4 (la 4 contiene solo `adhoc_filters` e `row_limit` come stringhe e `dimensionLimits`, che da sola andrebbe in Customize); le sezioni 5-13 restano in Customize a condizione che ogni loro controllo oggetto abbia `renderTrigger: true`. Test fallente: funzione di test `sectionTab(section)` che replica la regola di Superset (stesso criterio del Task 0.3) e verifica la tabella 3.1: sezioni 1-4 in Data, sezioni 5-13 in Customize. Il test fa da guardia: un `renderTrigger: false` aggiunto per errore in una sezione Customize fa fallire la suite. Commit: `fix(control-panel): pin query sections to Data tab, keep display sections in Customize`.

**Task 1.4: Uniformare etichette e descrizioni.** Applicare la decisione D2 (una lingua, niente emoji, descrizioni a una riga). Test: nessuna etichetta contiene `(` seguita da testo in altra lingua; nessuna contiene emoji (espressione regolare). Commit: `chore(control-panel): unify labels language and remove emoji`.

### Fase 2: Modalita Base/Avanzata e guida contestuale

**Task 2.1: Controllo `settingsLevel`.** Nuovo controllo `SelectControl` (`RadioButtonControl` non esiste nel registro dei controlli di Superset 6.1.0), `renderTrigger: true`, default `basic`, primo controllo della scheda Data. Test fallente: il controllo esiste, e il default e `basic`. Commit: `feat(control-panel): add basic/advanced settings level toggle`.

**Task 2.2: Funzione pura `isAdvancedVisible`.** In `src/plugin/controlVisibility.ts`: restituisce vero se il livello e `advanced` oppure se il controllo ha un valore diverso dal default. Test: quattro casi (basic senza valore, basic con valore, advanced, controllo sconosciuto). Commit: `feat(control-panel): add advanced-visibility rule`.

**Task 2.3: Applicare la regola ai controlli avanzati.** Elenco dei controlli base e avanzati da approvare (decisione D3). Test: in modalita basic il numero di controlli visibili e minore o uguale a 15 con un `form_data` vuoto. Commit: `feat(control-panel): hide advanced controls in basic mode`.

**Task 2.4: Avviso contestuale riusabile (FATTO).** Una riga React statica non puo leggere lo stato di Explore, quindi l'avviso e un controllo vero (`hintControl` in `src/plugin/controls/InlineHint.tsx`, nome con prefisso `hint_`) con `mapStateToProps` e `visibility`: compare solo quando c'e un messaggio. Ha `renderTrigger: true` (altrimenti sposterebbe la sua sezione nella scheda Data) e `shouldMapStateToProps: () => true` (Explore ricalcola `mapStateToProps` a ogni render solo se richiesto). Il valore e sempre `null`.

**Task 2.5: Avvisi di prerequisito (FATTO, ridotti a tre).** Sparkline (serve esattamente una colonna pivot, avviso quando sono 0 o 2 o piu), soppressione (soglia maggiore di 0 senza metriche: il codice non nasconde nulla), peso (media ponderata senza metrica peso: usa i pesi automatici sul volume, avviso informativo). Scartato l'avviso sul confronto temporale: i badge delta si alimentano anche da metriche companion e dal confronto tra periodi, quindi "servono colonne pivot" sarebbe falso. Ogni regola e verificata sul codice del plugin.

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
| D5 | Aggiungere `jsdom` e `@testing-library/react` come `devDependencies`? | DECISA: si (commit `b9dba097`). Installati con `--legacy-peer-deps` per un conflitto di peer dependency preesistente di `@superset-ui/core@0.20.4`. |
| D7 | Esporre nel pannello la funzione What-If (`enableWhatIf`), oggi attivabile solo da `form_data` e senza controllo? | DA DECIDERE: aggiungerla in "Trend e interazioni" come casella, oppure lasciarla nascosta. |
| D8 | La sezione "Privacy sui piccoli numeri" resta nascosta in modalita Base? | DECISA: no, la soglia `suppressionThreshold` e un controllo Base (sedicesimo). Le altre opzioni della sezione compaiono quando la soglia e maggiore di 0. |
| D6 | Dove pubblicare | DECISA: GitHub (`origin`, `main`) e aggiornamento del mirror in `superset-extensions` (che va anche su Bitbucket). Nessun repo Bitbucket dedicato. |

## 10. Registro dei risultati (da compilare durante l'esecuzione)

- Fase 0 completata il 2026-10-28 sul branch `feat/ux-control-panel`. Suite: 44 suite, 484 test, 18 snapshot, tutti verdi (base di partenza: 43 suite, 479 test).
- Task 0.1 (fatto, commit `92854a4`): snapshot dell'ordine dei controlli e del contratto per controllo (61 controlli: tipo, default, `renderTrigger`, presenza di `visibility`). Lo snapshot dell'ordine cambiera di proposito nel Task 1.2; quello del contratto non deve mai cambiare.
- Task 0.2 (fatto): `jest.config.js` usa `testEnvironment: 'node'`; `jsdom` e `@testing-library/react` non sono installati. Si puo comunque verificare il rendering statico con `renderToStaticMarkup` da `react-dom/server` (gia usato in `test/metricReordering.test.ts`). Per testare click e digitazione serve `jsdom` come dipendenza di sviluppo (decisione D5), da aggiungere all'inizio della Fase 3.
- Task 0.3 (fatto, per lettura del codice): vedi punto 8 della sezione 2. Non c'e un'istanza Superset accesa su questa macchina (porte 8088, 8089, 8080, 9000 senza risposta, Docker non avviato) e i sorgenti `C:\Users\admmaps\superset_6_1_0\superset` citati da `install-plugin.ps1` non esistono qui. La prova visiva nell'istanza reale resta nel Task 5.1.
- Task 0.4 (fatto, commit `a219456`): fixture `test/fixtures/formdata-reference.json` con un valore non predefinito per tutti i 61 controlli, e test `test/formDataReference.test.ts` che fissa il risultato di `resolveTransformOptions`. Le funzioni di normalizzazione accettano sia testo JSON sia array, ma i controlli attuali salvano `goals`, `metricDefinitions`, `tableCalculations`, `dimensionLimits` come TESTO e `conditionalFormatting` come ARRAY: gli editor devono mantenere esattamente questi tipi.
- Vincoli per gli editor emersi dai normalizzatori: **CORREZIONE (fase 3): `tableCalculations` legge la chiave `displayMode` (valori `companion_column` o `replace`), non `display`. L'esempio che stava nella descrizione del controllo usava `display`, che il codice ignora: vale sempre il predefinito `companion_column`. Il mio appunto precedente, che parlava di un alias `display`, era sbagliato.** `weightColumn` ha effetto solo con `aggregationMode` uguale a `weighted_avg`; `sparklineMetrics` e `suppressionMetrics` sono stringhe separate da virgola. Esiste anche una chiave `enableWhatIf` letta da `resolveTransformOptions` ma senza controllo nel pannello: da decidere se esporla (domanda aperta D7).
- Task 5.1 (prova finale): da fare.

### Fase 1 completata il 2026-10-28 (branch `feat/ux-control-panel`)

Suite finale: 45 suite, 492 test, 18 snapshot, tutti verdi. `tsc --noEmit` pulito, `npm run build` riuscito (`dist/` e ignorato da git). ESLint non e installato in questo ambiente, quindi `npm run lint` non e stato eseguito.

- Task 1.2 (`16f7d8a`): 61 controlli ricollocati in 13 sezioni per argomento, senza modificare tipo, default, `renderTrigger` o `visibility` di nessuno (snapshot del contratto invariato). Rimossi gli helper dei sottogruppi `subsectionHeader` e `subsectionDivider`. Il test `test/conditionalFormatting.test.ts` cercava il controllo nel vecchio sottogruppo: aggiornato.
- Task 1.3 (`c353151`): `tabOverride: 'data'` sulle sezioni 1-4. Nuovo test `tabOf` che replica la regola di Superset 6.1.0 e fa fallire la suite se una sezione Customize riceve un controllo senza `renderTrigger`. Nota: il tipo `TabOverride` di Superset dichiara anche `'customize'`, ma il container 6.1.0 non lo legge mai, quindi non ha effetto.
- Task 1.2b (`cb50521`): helper `hasPivotColumns` al posto di 8 condizioni ripetute, e `visibility` di sezione che nasconde "Opzioni delle colonne pivot" finche non si scelgono colonne pivot in modalita per dimensioni. Per questo `columns` e rimasta nella sezione 1 e non nella 3.
- Task 1.4 (`e2bd3f7`): tutte le etichette, descrizioni e voci di scelta in italiano, senza emoji ne doppie lingue; aggiunte le descrizioni mancanti a `nullHandling`, `pageSize` e `virtualizationThreshold`. Verificato che le chiavi delle 70 scelte e i 8 formati D3 siano identici a prima, quindi i chart salvati non cambiano. Nuovo test `test/controlPanelLanguage.test.ts` (etichetta e descrizione su ogni controllo, etichette di al massimo 60 caratteri, niente emoji, niente trattini lunghi o doppi, niente parole inglesi comuni).
- Un errore di procedura corretto: il commit del Task 1.2 e partito con un test rosso (`conditionalFormatting`), perche avevo concatenato il commit ai test senza condizionarlo all'esito. Il commit non era stato pushato ed e stato corretto con un amend. Da allora ogni commit e condizionato all'esito della suite.
- Non fatto: la prova visiva in un'istanza Superset reale (resta al Task 5.1).

### Fase 2 completata il 2026-10-28 (branch `feat/ux-control-panel`, commit `bd93fcd`)

Suite finale: 47 suite, 524 test, 18 snapshot, tutti verdi. `tsc --noEmit` pulito, `npm run build` riuscito (bundle da 169 a 173 kB). ESLint non installato.

- Livello impostazioni: nuovo controllo `settingsLevel` (Base o Avanzato, default Base), primo della scheda Data. Regola pura in `src/plugin/controlVisibility.ts`: un controllo avanzato e visibile in Base solo se ha un valore diverso dal default, oppure se il controllo da cui dipende (mappa `FOLLOWS`, 15 voci) ha un valore diverso dal default. Quindi accendere una funzione ne mostra le opzioni, e una opzione avanzata gia usata da un chart salvato non sparisce. Le regole di visibilita preesistenti restano valide sopra quella di livello.
- Lista Base approvata (15 controlli): `hierarchyType`, `groupby`, `columns`, `metrics`, `adhoc_filters`, `row_limit`, `initialExpandDepth`, `valueDisplayMode`, `showSubtotals`, `showGrandTotal`, `enableSearch`, `enableExport`, `numberFormat`, `minMaxDisplayMode`, `showVarianceDelta`. Su un chart nuovo si vedono 16 controlli, cioe i 15 piu il selettore del livello. Nota: il criterio iniziale diceva "15 o meno"; il conteggio onesto e 16 con il selettore.
- Sezioni vuote: una sezione senza controlli visibili sparisce per intero. In Base restano 7 sezioni su 13 (Struttura, Metriche, Filtri e limiti, Albero e navigazione, Evidenziazione dei valori, Formato e tema, Confronto nel tempo); spariscono Opzioni delle colonne pivot, Ordinamento, Obiettivi/definizioni/calcoli, Privacy sui piccoli numeri, Trend e interazioni, Prestazioni.
- Il livello e solo una scelta di visualizzazione: non e usato da `resolveTransformOptions` e non cambia il rendering. Il valore finisce comunque in `form_data` come `settingsLevel`.
- Limite noto: il selettore sta nella scheda Data; chi e nella scheda Customize deve tornare li per passare ad Avanzato.
- Snapshot: il contratto dei controlli preesistenti (tipo, default, `renderTrigger`) e identico a prima; ho tolto `hasVisibility` dallo snapshot perche la Fase 2 lo cambia di proposito, ed e coperto da test di comportamento. Nell'ordine compare solo `settingsLevel`.
- Verificato sul codice di Superset 6.1.0: la `visibility` di un controllo riceve `(props, controlData)` con `props.controls`; quella di sezione riceve `(props, controls)`; `mapStateToProps` riceve lo stato di Explore (che ha `controls`).
- Non fatto: prova visiva in un Superset reale (Task 5.1). Cosa in particolare guardare li: aspetto degli avvisi in tema scuro, e che il passaggio Base/Avanzato non richieda un nuovo "Aggiorna grafico".

Aggiornamento D8 (commit `a47ef3f`): la lista Base passa da 15 a 16 controlli aggiungendo `suppressionThreshold`; su un chart nuovo si vedono 17 controlli (16 piu il selettore del livello) e le sezioni visibili in Base diventano 8, perche "Privacy sui piccoli numeri" resta visibile. Suite: 47 suite, 525 test.

### Fase 3 completata il 2026-10-28 (branch `feat/ux-control-panel`, commit `b9dba097`, `003bbcfa`, `dd80fcc5`, `b7ae59ba`)

Suite finale: 51 suite, 600 test, 18 snapshot, tutti verdi. `tsc --noEmit` pulito, `npm run build` riuscito (bundle da 173 a 189 kB). ESLint non installato.

- Dipendenze di sviluppo: `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/dom`. Usate solo dai test dei componenti (`/** @jest-environment jsdom */` nel file); il resto della suite resta in ambiente `node`.
- Cinque editor a righe al posto dei campi JSON: `goals`, `conditionalFormatting`, `metricDefinitions`, `tableCalculations`, `dimensionLimits`. Un solo componente generico (`RuleListEditor`) guidato da uno schema per controllo (`ruleSpecs.ts`), invece di cinque componenti. Ogni riga ha campi con etichetta, menu per le scelte, campi numerici che accettano la virgola decimale, suggerimenti dalle metriche (e dalle dimensioni) del grafico, pulsanti sposta su, sposta giu e rimuovi, messaggi di validazione per riga e una frase di anteprima in italiano (per esempio "Se revenue e maggiore di 100: evidenzia la cella in verde (priorita 1).").
- Compatibilita: ogni editor scrive esattamente la forma che il controllo aveva (testo JSON per quattro, array per `conditionalFormatting`), con il valore vuoto predefinito quando non ci sono righe. I campi che l'editor non mostra (per esempio `icon`, `highlightRow`, `ci`) restano nella riga. I campi nascosti dal tipo scelto (per esempio il numeratore quando si passa da rapporto a somma) vengono tolti, perche il normalizzatore li ignorerebbe comunque. Ogni schema e provato con il normalizzatore reale del plugin.
- Vista JSON: pulsante "Modifica come JSON" in ogni editor. A differenza del vecchio `ArrayControl`, il JSON non valido mostra un errore e non sovrascrive il valore salvato; se il valore salvato non e un elenco valido, l'editor si apre direttamente sulla vista JSON senza toccarlo.
- Selettori di metriche (`MetricPicker`): `suppressionMetrics` e `sparklineMetrics` diventano elenchi di etichette con aggiunta (pulsante o Invio) e rimozione; `weightColumn` diventa un campo con suggerimenti. Il valore salvato resta il testo separato da virgole ("casi, ricoveri").
- Avvisi nuovi negli editor: obiettivo, definizione o calcolo ripetuti per la stessa metrica (conta solo il primo), espressione regolare non valida o troppo complessa, `decimals` fuori da 0-6, operandi mancanti per il tipo scelto, livello e dimensione entrambi assenti nei limiti, chiave `display` obsoleta nei calcoli (viene tolta alla prima modifica della riga).
- Snapshot del contratto: cambiano solo i tipi di 8 controlli (da `TextAreaControl`, `TextControl` o `ArrayControl` ai nuovi componenti); default e `renderTrigger` dei 61 controlli sono identici. Il test `test/controlPanelLanguage.test.ts` ora controlla anche i testi degli editor (etichette, opzioni, messaggi).
- Le descrizioni dei cinque controlli non contengono piu esempi JSON; quella di `tableCalculations` non porta piu l'esempio sbagliato con `display`.
- Task 3.9 (vista JSON) e stato realizzato dentro `RuleListEditor` invece che come passo separato.
- Non fatto: prova visiva in un Superset reale (Task 5.1). Cose da guardare li: aspetto di righe e menu nel tema chiaro e scuro (il componente usa solo HTML semplice e colori traslucidi), larghezza del pannello laterale, e che i suggerimenti delle metriche si aggiornino quando cambiano le metriche del grafico (`shouldMapStateToProps` e dichiarato, ma e verificato solo sul codice di Superset 6.1.0, non nell'interfaccia).

### Fase 4 completata il 2026-10-28 (branch `feat/ux-control-panel`, commit `eef9314a` e `a74b6503`)

Suite finale: 53 suite, 648 test, 18 snapshot, tutti verdi. `tsc --noEmit` pulito, `npm run build` riuscito (bundle da 189 a 197 kB). ESLint non installato.

- Nuovo controllo `metricSettings` ("Impostazioni per metrica") in fondo alla sezione Metriche, visibile solo in modalita Avanzata (non e nella lista Base). Una scheda richiudibile per ogni metrica del grafico (aperte da sole fino a 3 metriche), con un riassunto a scheda chiusa, per esempio "obiettivo 40, sparkline, protetta".
- Cosa scrive per ogni metrica: obiettivo e sua direzione (in `goals`), interruttore sparkline (in `sparklineMetrics`, visibile solo con le sparkline accese), interruttore "proteggi dai piccoli numeri" (in `suppressionMetrics`, visibile solo con una soglia maggiore di 0), interruttore "usa come peso" (in `weightColumn`, visibile solo con la media ponderata). Non ha un valore proprio: legge e scrive i controlli esistenti tramite `actions.setControlValue`, quindi gli altri editor mostrano sempre gli stessi dati.
- Ridotto rispetto al piano originale: formato, decimali e polarita si modificano solo per le metriche che hanno gia una definizione. Motivo verificato sul codice: queste proprieta vivono solo nelle definizioni (`metricDefinitions`), il normalizzatore scarta le voci senza `type`, e il `type` decide come si aggregano i padri (somma, media, rapporto...). Creare una definizione da una scheda obbligherebbe a inventare un tipo e potrebbe cambiare i valori. Per le altre metriche la scheda spiega come ottenerle. La scheda non crea mai una definizione.
- Regole per le sparkline: una lista vuota significa "tutte le metriche". La scheda parte dalla lista completa per escluderne una, riscrive la lista vuota quando tornano tutte selezionate, e blocca l'ultima metrica rimasta (una lista vuota la farebbe tornare "tutte").
- I cambi che non modificano i dati non scrivono nulla. Se `goals` o `metricDefinitions` non sono un elenco leggibile, la scheda non li tocca e lo dice.
- Verificato sul codice di Superset 6.1.0: ai controlli personalizzati arriva `actions` con `setControlValue`. Inoltre, quando un controllo passa da visibile a nascosto con un valore diverso dal default, Superset lo riporta al default (`resetOnHide`). La regola Base/Avanzata della Fase 2 non lo attiva (nasconde solo controlli gia al default), ma ne segue che un'opzione nascosta da una dipendenza, come la metrica peso quando la media non e ponderata, perde il valore. E un comportamento di Superset preesistente a questo lavoro.
- Non verificato: il comportamento reale di `setControlValue` in Explore (ogni cambio della scheda scrive una sola chiave, per costruzione) e l'aspetto delle schede nel pannello laterale. Tutto da guardare nel Task 5.1.

### Correzione prima della prova, 2026-10-28 (commit sul branch `feat/ux-control-panel`)

- Superset 6.1.0 usa React 17 (`superset-frontend/package.json`: `"react": "^17.0.2"`), mentre i test del plugin girano su React 18. I tre componenti nuovi (`RuleListEditor`, `MetricPicker`, `MetricSettingsCards`) usavano `useId`, che esiste solo da React 18: nel Superset reale i controlli sarebbero andati in errore. Sostituito con `useUid` (hook con contatore, nessuna dipendenza da React 18). Nuovo test `test/react17Compat.test.tsx` che fa fallire la suite se il sorgente usa un'API esclusiva di React 18 (`useId`, `useTransition`, `useDeferredValue`, `useSyncExternalStore`, `useInsertionEffect`, `startTransition`, `createRoot`, `hydrateRoot`, `flushSync`).
- Lezione: i test non vedono le differenze di versione dell'host. Prima di ogni API nuova di React o di Superset va controllata la versione 6.1.0.
- Preesistente da sistemare nel rilascio (Task 5.3): il `package.json` del plugin dichiara `peerDependencies` con `react ^18.2.0`, ma Superset 6.1.0 monta React 17.
- Il `dev-studio` non usa `controlPanel.tsx`: non serve per vedere il nuovo pannello, che si vede solo in Superset.
- Installazione: README e script puntano a `install-plugin.ps1` (radice); `docs/docker_installation_windows.md` cita `scripts\install.ps1`, un altro installer con opzioni diverse (`-Rollback`). Da riallineare nel Task 5.2.
