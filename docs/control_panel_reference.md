# Riferimento dei Parametri del Control Panel Explore

Questo documento descrive tutti i controlli disponibili nel pannello **Explore** di Apache Superset per il chart **Hierarchical Table & Matrix Grid**.

---

## 1. Sezione Query Configuration

| Controllo | Tipo | Descrizione |
|---|---|---|
| **Hierarchy Mode** | Select | Scegli tra `Multi-Dimension Grouping` (elenco ordinato di dimensioni) e `Parent-Child Adjacency` (chiavi ID / Parent ID). |
| **Hierarchy Dimensions** | Multi-Select | Lista ordinata di colonne dimensionali (dal livello radice al livello foglia). Visibile solo in modalità Multi-Dimension. |
| **Node ID Column** | Select | Colonna con l'identificativo univoco del nodo. Visibile solo in modalità Parent-Child. |
| **Parent ID Column** | Select | Colonna contenente l'ID del nodo genitore (NULL per i nodi radice). Visibile solo in modalità Parent-Child. |
| **Node Label Column** | Select | Colonna testuale da mostrare come etichetta del nodo. Opzionale. |
| **Metrics** | Metrics | Metriche numeriche da calcolare ed esporre nella tabella. |
| **Filters** | Adhoc Filters | Filtri applicati al dataset prima dell'aggregazione. |
| **Row limit** | Select | Limite massimo di righe restituite dalla query backend. |

---

## 2. Sezione Hierarchy & Tree Display Options

| Controllo | Tipo | Valore Default | Descrizione |
|---|---|---|---|
| **Initial Expand Depth** | Select | `Level 1` | Profondità iniziale di apertura dell'albero al caricamento (`Expand All`, `Collapse All`, `Level 1`, `Level 2`, ecc.). |
| **Show Subtotals / Rollup** | Checkbox | `true` | Mostra i valori aggregati calcolati per ciascun nodo padre. |
| **Show Grand Total Row** | Checkbox | `true` | Mostra la riga di riepilogo complessivo (Totale Generale) all'inizio della tabella. |
| **Tree Indentation Size (px)** | Slider | `20` | Ampiezza in pixel del rientro per ogni livello di profondità dell'albero. |
| **Sticky Table Header** | Checkbox | `true` | Mantiene le intestazioni delle colonne visibili durante lo scroll verticale. |
| **Sticky Hierarchy Column** | Checkbox | `true` | Blocca la prima colonna dell'albero durante lo scroll orizzontale. |
| **Enable In-Tree Search** | Checkbox | `true` | Mostra la casella di ricerca in tempo reale sopra la tabella. |
| **Compact Row Padding** | Checkbox | `false` | Riduce l'altezza e il padding delle righe per visualizzazioni ad alta densità. |

---

## 3. Sezione Formatting & Aesthetics

| Controllo | Tipo | Valore Default | Descrizione |
|---|---|---|---|
| **Number Format** | Select | `SMART_NUMBER` | Formato D3 per la formattazione dei valori numerici delle metriche (es. `,0.2f`, `~s`, `.1%`). |
| **Currency Symbol Prefix** | Text | `""` | Prefisso testuale per i valori monetari (es. `€`, `$`, `£`). |
| **Striped Alternating Rows** | Checkbox | `true` | Alterna il colore di sfondo delle righe per agevolare la lettura. |
