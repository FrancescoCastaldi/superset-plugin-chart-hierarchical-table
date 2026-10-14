# Benchmark pipeline dati v0.4.0

Script: `node scripts/bench.mjs [righe] [periodi]` (esegue `transformProps` su un dataset sintetico, 3 livelli di gerarchia, 1 colonna pivot, 4 metriche, delta e totali di riga attivi; mediana di 5 esecuzioni).

| Scenario | v0.3.3 | v0.4.0 | Variazione |
|:---|---:|---:|---:|
| 50.000 righe, 24 periodi | 265 ms | 180 ms (175-190) | -30% |

Interventi: memoizzazione per nome dei classificatori di metrica (`isDerivedMetric`, `isRateMetric`, `isDistinctEntityMetric`, `splitMetricKey`), chiave di percorso incrementale nel costruttore dell'albero, cache dei formattatori `Intl.NumberFormat` e delle informazioni sul nome metrica nel rendering delle celle, scroll della finestra virtualizzata quantizzato a blocchi di 10 righe.

Bundle `dist/index.esm.js`: 120,7 KB (v0.3.3 buildata il 2026-10-08), 109,6 KB dopo la rimozione dell immagine duplicata e delle dipendenze inutilizzate, 121,6 KB con le feature sanitarie di v0.4.0 (metric definitions, intervalli, soppressione, sparkline).

Gli snapshot di caratterizzazione di `transformProps` sono invariati.
