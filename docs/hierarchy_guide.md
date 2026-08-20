# Guida alla Modellazione delle Gerarchie

Il plugin supporta due modelli concettuali di dati gerarchici. Questo documento spiega come modellare i dati nel database per ottenere i migliori risultati in Apache Superset.

---

## 1. Modello Multi-Dimensione (Level-based Hierarchy)

Questo modello è ideale per dati dimensionali categorici in cui ogni riga rappresenta un record di dettaglio con attributi su diversi livelli di granularità.

### Esempio di Schema Tabellare
| region | country | city | store_name | sales_amount | units_sold |
|---|---|---|---|---|---|
| EMEA | Italy | Milan | Duomo Flagship | 120000 | 450 |
| EMEA | Italy | Rome | Colosseo Store | 95000 | 380 |
| EMEA | Germany | Berlin | Mitte Store | 110000 | 410 |
| APAC | Japan | Tokyo | Shibuya Store | 210000 | 890 |

### Configurazione in Superset
- **Hierarchy Mode**: `Multi-Dimension Grouping (Level-based)`
- **Hierarchy Dimensions**: `region`, `country`, `city`, `store_name` (in questo ordine esatto).
- **Metrics**: `SUM(sales_amount)`, `SUM(units_sold)`.

### Comportamento
L'albero aggregherà automaticamente:
- Livello 0: Totali per `region` (es. Totale EMEA, Totale APAC).
- Livello 1: Totali per `country` all'interno della regione.
- Livello 2: Totali per `city`.
- Livello 3: Record del singolo `store_name`.

---

## 2. Modello Parent-Child (Adjacency List)

Questo modello è indicato per gerarchie ricorsive con profondità variabile, come organigrammi aziendali, alberi di categorie ad n-livelli o piani dei conti contabili.

### Esempio di Schema Tabellare
| account_id | parent_account_id | account_name | amount |
|---|---|---|---|
| 1000 | NULL | Ricavi Totali | 0 |
| 1100 | 1000 | Ricavi da Vendite | 450000 |
| 1200 | 1000 | Ricavi da Servizi | 120000 |
| 2000 | NULL | Costi Operativi | 0 |
| 2100 | 2000 | Costo del Personale | 180000 |
| 2200 | 2000 | Costi di Marketing | 75000 |

### Configurazione in Superset
- **Hierarchy Mode**: `Parent-Child Adjacency (ID / Parent ID)`
- **Node ID Column**: `account_id`
- **Parent ID Column**: `parent_account_id`
- **Node Label Column**: `account_name`
- **Metrics**: `SUM(amount)`

### Comportamento
Il plugin individua i nodi radice (dove `parent_account_id IS NULL`) e calcola per ciascun nodo padre la somma aggregata di tutti i suoi nodi discendenti (subtotale).

---

## 3. Cross-Filtering & Selezione Multipla sui Due Modelli

Quando il cross-filtering è abilitato (`emit_filter = true`), il plugin gestisce la selezione multipla in modo differenziato e coerente per entrambi i modelli:

- **Nel modello Multi-Dimension**:
  - Selezionando un nodo (es. `USA` sotto `Americas`), il filtro cattura tutti i record che hanno `region = 'Americas' AND country = 'USA'`.
  - Selezionando più nodi (es. `USA` e `Germany`), il filtro applica l'unione dei rami (`(region = 'Americas' AND country = 'USA') OR (region = 'EMEA' AND country = 'Germany')`), emettendo un filtro Superset `IN` ottimizzato.
- **Nel modello Parent-Child**:
  - Selezionando un nodo genitore (es. `Marco Bianchi - CTO`), il filtro include automaticamente l'ID selezionato e tutti gli ID dei nodi discendenti (sottoalbero ricorsivo).
  - Selezionando più persone o conti contabili, il filtro include l'unione di tutti gli ID dei relativi sottoalberi senza duplicare i conteggi.
