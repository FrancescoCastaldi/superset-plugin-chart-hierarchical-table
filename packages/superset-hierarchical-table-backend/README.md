# superset-hierarchical-table-backend

Python companion package and computation engine for the **Apache Superset Hierarchical Table Chart Plugin**.

## Features

- `aggregate_hierarchical_dataframe`: Multi-level Pandas DataFrame grouping and nested tree structure generation.
- `rollup_dataframe`: Roll-up calculations for sub-totals across arbitrary dimension depths.
- `resolve_parent_child_hierarchy`: Recursive adjacency list graph resolver with cycle detection, depth indexing, and metric aggregation.
- `build_recursive_cte_query`: SQL generator for Recursive Common Table Expressions (CTE) across PostgreSQL, Snowflake, BigQuery, MySQL 8+, SQLite, and DuckDB.

## Installation

```bash
pip install -e .
```

## Running Tests

```bash
pytest tests/ -v
```
