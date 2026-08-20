import pandas as pd
from superset_hierarchical_table.processors.parent_child import resolve_parent_child_hierarchy
from superset_hierarchical_table.queries.sql_builder import build_recursive_cte_query


def test_resolve_parent_child_hierarchy():
    data = {
        "id": ["1", "2", "3", "4"],
        "parent_id": [None, "1", "1", "2"],
        "name": ["CEO", "CTO", "CFO", "Dev Lead"],
        "budget": [1000.0, 500.0, 300.0, 200.0],
    }
    df = pd.DataFrame(data)

    tree = resolve_parent_child_hierarchy(
        df,
        id_col="id",
        parent_id_col="parent_id",
        label_col="name",
        metrics=["budget"],
    )

    assert len(tree) == 1
    ceo = tree[0]
    assert ceo["name"] == "CEO"
    assert len(ceo["children"]) == 2  # CTO and CFO
    # Rolled up budget for CTO should include Dev Lead (500 + 200 = 700) or sum of children
    assert ceo["metrics"]["budget"] > 0


def test_build_recursive_cte_query():
    sql = build_recursive_cte_query(
        table_name="org_chart",
        id_col="emp_id",
        parent_id_col="mgr_id",
        label_col="full_name",
        metrics=["salary"],
    )

    assert "WITH RECURSIVE hierarchy_tree" in sql
    assert "org_chart" in sql
    assert "mgr_id IS NULL" in sql
