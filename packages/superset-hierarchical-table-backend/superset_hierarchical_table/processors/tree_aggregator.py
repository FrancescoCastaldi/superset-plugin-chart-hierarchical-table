from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np


def rollup_dataframe(
    df: pd.DataFrame,
    dimensions: List[str],
    metrics: List[str],
    agg_func: str = "sum"
) -> pd.DataFrame:
    """
    Computes roll-up aggregation across multiple dimension levels.
    Returns a concatenated DataFrame containing aggregations at each hierarchy depth.
    """
    if df.empty or not dimensions or not metrics:
        return df

    results = []
    
    # Aggregations for each prefix of dimensions: level 1, level 2, ... level N
    for i in range(1, len(dimensions) + 1):
        level_dims = dimensions[:i]
        agg_dict = {m: agg_func for m in metrics if m in df.columns}
        
        grouped = df.groupby(level_dims, as_index=False, dropna=False).agg(agg_dict)
        grouped["_depth"] = i - 1
        grouped["_level_dimension"] = dimensions[i - 1]
        
        # Fill missing deeper dimensions with None
        for dim in dimensions[i:]:
            grouped[dim] = None
            
        results.append(grouped)

    combined = pd.concat(results, ignore_index=True)
    return combined


def aggregate_hierarchical_dataframe(
    df: pd.DataFrame,
    dimensions: List[str],
    metrics: List[str],
    agg_func: str = "sum"
) -> List[Dict[str, Any]]:
    """
    Converts a flat pandas DataFrame into a nested hierarchical tree structure.
    """
    if df.empty or not dimensions:
        return []

    # Clean missing values in dimensions
    work_df = df.copy()
    for dim in dimensions:
        work_df[dim] = work_df[dim].fillna("(Empty)").astype(str)

    def build_subtree(current_df: pd.DataFrame, level: int, current_path: List[str]) -> List[Dict[str, Any]]:
        if level >= len(dimensions):
            return []

        dim = dimensions[level]
        is_leaf = (level == len(dimensions) - 1)
        tree_nodes = []

        for val, group in current_df.groupby(dim, sort=True):
            node_path = current_path + [str(val)]
            node_key = " > ".join(node_path)

            node_metrics: Dict[str, Optional[float]] = {}
            for m in metrics:
                if m in group.columns:
                    if agg_func == "sum":
                        node_metrics[m] = float(group[m].sum())
                    elif agg_func == "avg":
                        node_metrics[m] = float(group[m].mean())
                    elif agg_func == "min":
                        node_metrics[m] = float(group[m].min())
                    elif agg_func == "max":
                        node_metrics[m] = float(group[m].max())
                    elif agg_func == "count":
                        node_metrics[m] = float(len(group))
                    else:
                        node_metrics[m] = float(group[m].sum())
                else:
                    node_metrics[m] = None

            node: Dict[str, Any] = {
                "key": node_key,
                "id": node_key,
                "name": str(val),
                "dimension": dim,
                "depth": level,
                "path": node_path,
                "isLeaf": is_leaf,
                "metrics": node_metrics,
                "subtotals": node_metrics,
            }

            if not is_leaf:
                node["children"] = build_subtree(group, level + 1, node_path)

            tree_nodes.append(node)

        return tree_nodes

    return build_subtree(work_df, 0, [])
