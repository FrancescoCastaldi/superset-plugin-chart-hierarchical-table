# Dataset di Esempio

Questa cartella contiene dataset di test pronti per essere caricati in Apache Superset (tramite la funzionalità **+ -> Data -> Upload CSV to database**) per testare le funzionalità del chart `Hierarchical Table & Matrix Grid`.

---

## 1. `sales_hierarchy.csv`

- **Tipo di Gerarchia**: Multi-Dimension Level Grouping.
- **Dimensioni**: `region` > `country` > `city` > `store_name`.
- **Metriche**: `revenue`, `units_sold`, `cost`.
- **Caso d'uso**: Analisi vendite retail geografica e calcolo subtotali per area.

## 2. `org_chart.csv`

- **Tipo di Gerarchia**: Parent-Child Adjacency List.
- **ID Col**: `employee_id`.
- **Parent ID Col**: `manager_id`.
- **Label Col**: `name`.
- **Metriche**: `salary`, `budget_managed`.
- **Caso d'uso**: Organigramma aziendale a livelli multipli con roll-up del budget e stipendi gestiti.

## 3. `financial_pnl.csv`

- **Tipo di Gerarchia**: Parent-Child Adjacency List per Contabilità e Finanza.
- **ID Col**: `account_code`.
- **Parent ID Col**: `parent_account_code`.
- **Label Col**: `account_name`.
- **Metriche**: `q1_actual`, `q2_actual`, `full_year_budget`.
- **Caso d'uso**: Conto economico gerarchico (P&L / Bilancio) con aggregazione da sotto-voci a voci mastro.
