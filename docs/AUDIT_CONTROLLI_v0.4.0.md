# Audit dei controlli v0.4.0

Verifica controllo per controllo della catena pannello Explore, `formDataOptions.ts`, consumatore (`transformProps`, `columnBuilders`, `HierarchicalTable.tsx`), eseguita sul codice di v0.3.3. Questo documento elenca cosa e stato corretto in v0.4.0 e cosa resta noto.

## Corretto in v0.4.0

| Voce | Esito |
|:---|:---|
| Chiavi pivot da timestamp epoch non combaciavano con le celle dell'albero (celle, totali e delta vuoti) | Corretto: normalizzazione condivisa in `src/utils/dimensionValue.ts` |
| Metrica derivata (nome con `tasso`, `pct`, `delta`...) valorizzata solo per il primo periodo di una foglia | Corretto in `buildMultiDimensionTree` |
| `aggregationMode` avg, min, max, count offerti ma sempre sommati | Corretto: `rollupFunction(weightColumn, mode)` |
| `showSubtotals` risolto ma mai letto | Corretto: senza subtotali le righe padre non mostrano valori |
| Ordine colonne pivot solo alfabetico (mesi e giorni in ordine sbagliato) | Corretto: ordine naturale in `chronologicalOrder` |
| Colori dei delta ignoravano la polarita | Corretto con `polarity` in `metricDefinitions` |
| `diff` in "Differibile" e "differite" letto come differenza | Corretto: `hasDiffToken` |
| "attesa" in nomi di conteggi (Prenotazioni in attesa) trattata come tempo medio | Corretto in `isRateMetric` |
| Etichetta "CSV / Excel" con solo CSV | Etichetta corretta |
| Euristiche sul nome che prevalgono sulle scelte dell'utente | Nuovo `metricDefinitions` che prevale su roll-up e formato |

## Noto e non corretto (candidati alla prossima iterazione)

| Area | Problema | Riferimento |
|:---|:---|:---|
| Cross-filter, modalita Parent-Child | Il filtro usa le etichette e una colonna chiamata `Dimension`, non gli ID | `HierarchicalTable.tsx` (`onNodeClick`), `eventHandlers.ts` |
| Cross-filter, selezione multipla | Un `IN` per colonna: seleziona tutte le combinazioni, non i soli percorsi | `eventHandlers.ts:35-77` |
| `filterState` | Non letto: azzerare i filtri dal dashboard non azzera la selezione della tabella | `transformProps.ts` |
| Pivot a due dimensioni | `pivotTimeDeltaMode`, `combineMetric`, goal e confronto temporale non si applicano, ma i controlli restano visibili | `metricLayout.ts`, `controlPanel.tsx` (visibility) |
| Totali di riga | `computeHorizontalRowTotals` somma sempre i periodi, anche per tassi e medie (senza `metricDefinitions`) | `aggregations.ts` |
| Ordinamento per `delta_x_pct` | Il pannello propone `delta_x_pct` per ogni `x_corr`, ma la regola cerca gli operandi `x` e `x_conf` | `controlPanel.tsx:475`, `aggregations.ts` |
| `enableHierarchicalSort` spento | Annulla anche l'ordinamento di default | `HierarchicalTable.tsx` |
| `numberFormat` con `%` nel nome | Le regole sul nome vengono prima: `.1%` stampa il valore grezzo con `%` | `formatters.ts` |
| `themeProfile` custom | La heatmap non usa i colori personalizzati | `themes.ts`, `formatters.ts` |
| `initialExpandDepth` | Letto solo al primo montaggio | `HierarchicalTable.tsx` |
| Virtualizzazione e `compactMode` | L'altezza riga e fissa a 32 px | `useFlatTreeVirtualization.ts` |
| Alias snake_case | Gli alias di nomi diversi (`showRollupTotals`) non sono raggiungibili; il test `formDataOptions.test.ts` fissa questo comportamento come contratto con i chart salvati | `formDataOptions.ts` |
| Pacchetto Python `packages/superset-hierarchical-table-backend` | Non usato dal frontend ne dagli installer; versione 0.1.2 in `pyproject.toml` contro 0.2.0 in `__init__.py` | `Makefile`, CI |
| `scripts/installer.py` | Cerca percorsi che non esistono piu e fallisce all'avvio | `scripts/installer.py:73-77` |
| Documentazione | `docs/control_panel_reference.md` descrive controlli rimossi in 0.2.2 e solo circa 20 dei 50 controlli | `docs/` |

## Prestazioni: indicazioni non ancora applicate

Dall'audit prestazionale: ricerca O(n^2) della radice in `buildParentChildTree`, doppio calcolo di `metrics` e `subtotals` per ogni nodo, `transformProps` senza memoizzazione tra ridimensionamenti e cambi di filtro, intestazione e riga del totale che si ri-renderizzano a ogni scroll, virtualizzazione solo sulle righe (non sulle colonne), `backdrop-filter` sulle intestazioni sticky, `table-layout: auto` con finestra di righe.
