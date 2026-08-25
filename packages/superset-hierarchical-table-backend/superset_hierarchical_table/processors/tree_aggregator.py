from typing import List, Dict, Any, Optional, Union
import pandas as pd
import numpy as np


def rollup_dataframe(
    df: pd.DataFrame,
    dimensions: List[str],
    metrics: List[str],
    agg_func: Union[str, Dict[str, str]] = "sum"
) -> pd.DataFrame:
    """
    Computes roll-up aggregation across multiple dimension levels.
    Supports either a single agg_func string or a metric-to-agg mapping dictionary.
    """
    if df.empty or not dimensions or not metrics:
        return df

    results = []
    
    # Build aggregation dictionary
    if isinstance(agg_func, dict):
        base_agg_dict = {m: agg_func.get(m, "sum") for m in metrics if m in df.columns}
    else:
        base_agg_dict = {m: agg_func for m in metrics if m in df.columns}

    # Aggregations for each prefix of dimensions: level 1, level 2, ... level N
    for i in range(1, len(dimensions) + 1):
        level_dims = dimensions[:i]
        
        grouped = df.groupby(level_dims, as_index=False, dropna=False).agg(base_agg_dict)
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
    agg_func: Union[str, Dict[str, str]] = "sum",
    sort_metric: Optional[str] = None,
    sort_ascending: bool = False,
    prior_period_df: Optional[pd.DataFrame] = None
) -> List[Dict[str, Any]]:
    """
    Converts a flat pandas DataFrame into a nested hierarchical tree structure with
    custom per-metric aggregations, hierarchical sorting, and optional period-over-period delta.
    """
    if df.empty or not dimensions:
        return []

    # Clean missing values in dimensions
    work_df = df.copy()
    for dim in dimensions:
        work_df[dim] = work_df[dim].fillna("(Empty)").astype(str)

    def get_agg_for_metric(m: str) -> str:
        if isinstance(agg_func, dict):
            return agg_func.get(m, "sum").lower()
        return agg_func.lower()

    def build_subtree(current_df: pd.DataFrame, level: int, current_path: List[str]) -> List[Dict[str, Any]]:
        if level >= len(dimensions):
            return []

        dim = dimensions[level]
        is_leaf = (level == len(dimensions) - 1)
        tree_nodes = []

        for val, group in current_df.groupby(dim, sort=False):
            node_path = current_path + [str(val)]
            node_key = " > ".join(node_path)

            node_metrics: Dict[str, Optional[float]] = {}
            for m in metrics:
                if m in group.columns:
                    func_name = get_agg_for_metric(m)
                    if func_name == "sum":
                        node_metrics[m] = float(group[m].sum())
                    elif func_name in ("avg", "mean"):
                        node_metrics[m] = float(group[m].mean())
                    elif func_name == "min":
                        node_metrics[m] = float(group[m].min())
                    elif func_name == "max":
                        node_metrics[m] = float(group[m].max())
                    elif func_name == "count":
                        node_metrics[m] = float(len(group))
                    else:
                        node_metrics[m] = float(group[m].sum())
                else:
                    node_metrics[m] = None

            # Calculate Period-over-Period Variance Delta if prior_period_df provided
            deltas: Dict[str, Optional[Dict[str, float]]] = {}
            if prior_period_df is not None and not prior_period_df.empty:
                prior_match = prior_period_df
                for lvl_idx, path_val in enumerate(node_path):
                    if lvl_idx < len(dimensions) and dimensions[lvl_idx] in prior_match.columns:
                        prior_match = prior_match[prior_match[dimensions[lvl_idx]].astype(str) == path_val]

                for m in metrics:
                    curr_val = node_metrics.get(m)
                    if curr_val is not None and m in prior_match.columns and not prior_match.empty:
                        func_name = get_agg_for_metric(m)
                        if func_name == "sum":
                            prev_val = float(prior_match[m].sum())
                        elif func_name in ("avg", "mean"):
                            prev_val = float(prior_match[m].mean())
                        else:
                            prev_val = float(prior_match[m].sum())

                        diff = curr_val - prev_val
                        pct_change = (diff / prev_val * 100.0) if prev_val != 0 else 0.0
                        deltas[m] = {
                            "diff": diff,
                            "pct_change": pct_change,
                            "prev_val": prev_val,
                        }

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
                "deltas": deltas,
            }

            if not is_leaf:
                node["children"] = build_subtree(group, level + 1, node_path)

            tree_nodes.append(node)

        # Apply Hierarchical Sort within current level
        if sort_metric:
            def sort_key(n: Dict[str, Any]):
                val = n.get("metrics", {}).get(sort_metric)
                return (val is not None, val if val is not None else float('-inf'))
            tree_nodes.sort(key=sort_key, reverse=not sort_ascending)

        return tree_nodes

    return build_subtree(work_df, 0, [])


def export_hierarchy_to_records(
    tree: List[Dict[str, Any]],
    metrics: List[str],
    indent_spaces: int = 2
) -> List[Dict[str, Any]]:
    """
    Flattens a hierarchical tree into an ordered list of records suitable for CSV/Excel export,
    preserving depth indentation and calculated subtotals.
    """
    rows = []

    def traverse(nodes: List[Dict[str, Any]]):
        for node in nodes:
            depth = node.get("depth", 0)
            indent = " " * (depth * indent_spaces)
            row_dict = {
                "Hierarchy Node": f"{indent}{node.get('name', '')}",
                "Depth": depth,
                "Path": " > ".join(node.get("path", [])),
                "Is Leaf": "Yes" if node.get("isLeaf") else "No (Subtotal)",
            }
            for m in metrics:
                row_dict[m] = node.get("metrics", {}).get(m)

            rows.append(row_dict)
            if "children" in node and node["children"]:
                traverse(node["children"])

    traverse(tree)
    return rows

