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
