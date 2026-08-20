import pandas as pd
from superset_hierarchical_table.processors.tree_aggregator import (
    rollup_dataframe,
    aggregate_hierarchical_dataframe,
)


def test_rollup_dataframe():
    data = {
        "region": ["EMEA", "EMEA", "APAC"],
        "country": ["IT", "DE", "JP"],
        "revenue": [100.0, 150.0, 300.0],
    }
    df = pd.DataFrame(data)
    
    rollup_df = rollup_dataframe(df, dimensions=["region", "country"], metrics=["revenue"])
    assert not rollup_df.empty
    assert len(rollup_df) > len(df)
    
    # Check level 0 (region only)
    emea_agg = rollup_df[(rollup_df["_depth"] == 0) & (rollup_df["region"] == "EMEA")]
    assert len(emea_agg) == 1
    assert emea_agg["revenue"].iloc[0] == 250.0


def test_aggregate_hierarchical_dataframe():
    data = {
        "region": ["EMEA", "EMEA", "APAC"],
        "country": ["IT", "DE", "JP"],
        "sales": [10, 20, 50],
    }
    df = pd.DataFrame(data)
    
    tree = aggregate_hierarchical_dataframe(df, dimensions=["region", "country"], metrics=["sales"])
    assert len(tree) == 2  # EMEA and APAC

    emea_node = next(n for n in tree if n["name"] == "EMEA")
    assert emea_node["metrics"]["sales"] == 30.0
    assert len(emea_node["children"]) == 2
