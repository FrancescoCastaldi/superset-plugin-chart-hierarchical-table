from typing import List, Optional


def build_recursive_cte_query(
    table_name: str,
    id_col: str,
    parent_id_col: str,
    label_col: str,
    metrics: List[str],
    max_depth: int = 10,
    dialect: str = "ansi"
) -> str:
    """
    Generates a SQL Recursive CTE query that calculates hierarchy depth and path.
    Compatible with PostgreSQL, MySQL 8+, SQLite, Snowflake, DuckDB, and BigQuery.
    """
    metric_select = ", ".join([f"t.{m}" for m in metrics])
    metric_cols = (", " + metric_select) if metrics else ""

    sql = f"""WITH RECURSIVE hierarchy_tree AS (
    -- Anchor member: root nodes (parent_id IS NULL)
    SELECT
        t.{id_col} AS node_id,
        t.{parent_id_col} AS parent_id,
        t.{label_col} AS node_label,
        0 AS depth,
        CAST(t.{label_col} AS VARCHAR(1000)) AS path
        {metric_cols}
    FROM {table_name} t
    WHERE t.{parent_id_col} IS NULL

    UNION ALL

    -- Recursive member: child nodes
    SELECT
        c.{id_col} AS node_id,
        c.{parent_id_col} AS parent_id,
        c.{label_col} AS node_label,
        h.depth + 1 AS depth,
        CAST(h.path || ' > ' || c.{label_col} AS VARCHAR(1000)) AS path
        {", ".join([f"c.{m}" for m in metrics]) if metrics else ""}
    FROM {table_name} c
    INNER JOIN hierarchy_tree h ON c.{parent_id_col} = h.node_id
    WHERE h.depth < {max_depth}
)
SELECT * FROM hierarchy_tree
ORDER BY path;"""

    return sql


def build_time_comparison_cte_query(
    table_name: str,
    date_col: str,
    id_col: str,
    parent_id_col: str,
    label_col: str,
    metrics: List[str],
    time_grain: str = "year",
    ref_start: str = "2026-01-01",
    ref_end: str = "2026-12-31",
    comp_start: str = "2025-01-01",
    comp_end: str = "2025-12-31",
    max_depth: int = 10
) -> str:
    """
    Generates a high-performance Recursive CTE query comparing two distinct time periods (DoD, WoW, MoM, YoY)
    with calculated variance delta percentage columns.
    """
    metric_aggs_ref = ", ".join([f"SUM(CASE WHEN {date_col} BETWEEN '{ref_start}' AND '{ref_end}' THEN {m} ELSE 0 END) AS {m}_curr" for m in metrics])
    metric_aggs_comp = ", ".join([f"SUM(CASE WHEN {date_col} BETWEEN '{comp_start}' AND '{comp_end}' THEN {m} ELSE 0 END) AS {m}_prev" for m in metrics])

    delta_calcs = ", ".join([
        f"({m}_curr - {m}_prev) AS {m}_diff, "
        f"CASE WHEN {m}_prev = 0 THEN NULL ELSE ROUND((({m}_curr - {m}_prev)::numeric / ABS({m}_prev)) * 100.0, 2) END AS {m}_pct_delta"
        for m in metrics
    ])

    sql = f"""WITH aggregated_periods AS (
    SELECT
        {id_col},
        {parent_id_col},
        {label_col},
        {metric_aggs_ref},
        {metric_aggs_comp}
    FROM {table_name}
    WHERE {date_col} BETWEEN '{comp_start}' AND '{ref_end}'
    GROUP BY {id_col}, {parent_id_col}, {label_col}
),
WITH RECURSIVE hierarchy_comparison AS (
    -- Root nodes
    SELECT
        t.{id_col} AS node_id,
        t.{parent_id_col} AS parent_id,
        t.{label_col} AS node_label,
        0 AS depth,
        CAST(t.{label_col} AS VARCHAR(1000)) AS path,
        {", ".join([f"t.{m}_curr, t.{m}_prev" for m in metrics])}
    FROM aggregated_periods t
    WHERE t.{parent_id_col} IS NULL

    UNION ALL

    -- Child nodes
    SELECT
        c.{id_col} AS node_id,
        c.{parent_id_col} AS parent_id,
        c.{label_col} AS node_label,
        h.depth + 1 AS depth,
        CAST(h.path || ' > ' || c.{label_col} AS VARCHAR(1000)) AS path,
        {", ".join([f"c.{m}_curr, c.{m}_prev" for m in metrics])}
    FROM aggregated_periods c
    INNER JOIN hierarchy_comparison h ON c.{parent_id_col} = h.node_id
    WHERE h.depth < {max_depth}
)
SELECT
    *,
    {delta_calcs}
FROM hierarchy_comparison
ORDER BY path;"""

    return sql

