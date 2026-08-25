from typing import List, Dict, Any, Optional, Set, Union
import pandas as pd


def resolve_parent_child_hierarchy(
    df: pd.DataFrame,
    id_col: str,
    parent_id_col: str,
    label_col: Optional[str],
    metrics: List[str],
    agg_func: Union[str, Dict[str, str]] = "sum",
    sort_metric: Optional[str] = None,
    sort_ascending: bool = False,
    prior_period_df: Optional[pd.DataFrame] = None
) -> List[Dict[str, Any]]:
    """
    Transforms a parent-child adjacency list DataFrame into a nested tree structure
    with rolled up metrics, depth calculation, hierarchical sorting, and period-over-period variance.
    """
    if df.empty or id_col not in df.columns:
        return []

    def get_agg_for_metric(m: str) -> str:
        if isinstance(agg_func, dict):
            return agg_func.get(m, "sum").lower()
        return agg_func.lower()

    node_dict: Dict[str, Dict[str, Any]] = {}
    parent_to_children: Dict[Optional[str], List[str]] = {}
    all_ids: Set[str] = set()

    for _, row in df.iterrows():
        node_id = str(row[id_col])
        if not node_id:
            continue

        all_ids.add(node_id)
        parent_raw = row.get(parent_id_col)
        parent_id = str(parent_raw) if pd.notna(parent_raw) and str(parent_raw).strip() != "" else None

        name = str(row[label_col]) if label_col and label_col in row and pd.notna(row[label_col]) else node_id

        metric_vals: Dict[str, Optional[float]] = {}
        for m in metrics:
            if m in row and pd.notna(row[m]):
                try:
                    metric_vals[m] = float(row[m])
                except (ValueError, TypeError):
                    metric_vals[m] = 0.0
            else:
                metric_vals[m] = 0.0

        node_dict[node_id] = {
            "key": node_id,
            "id": node_id,
            "name": name,
            "depth": 0,
            "path": [name],
            "isLeaf": True,
            "metrics": metric_vals,
            "subtotals": dict(metric_vals),
            "deltas": {},
            "children": [],
        }

        if parent_id not in parent_to_children:
            parent_to_children[parent_id] = []
        parent_to_children[parent_id].append(node_id)

    # Root detection:
    root_ids = []
    for nid, node_data in node_dict.items():
        is_root = True
        for p, children in parent_to_children.items():
            if p in all_ids and nid in children:
                is_root = False
                break
        if is_root:
            root_ids.append(nid)

    def assemble(nid: str, depth: int, parent_path: List[str], visited: Set[str]) -> Optional[Dict[str, Any]]:
        if nid in visited or nid not in node_dict:
            return None  # Prevent cycle

        visited.add(nid)
        node = dict(node_dict[nid])
        node["depth"] = depth
        node["path"] = parent_path + [node["name"]]

        child_ids = parent_to_children.get(nid, [])
        if child_ids:
            node["isLeaf"] = False
            children = []
            for cid in child_ids:
                child_node = assemble(cid, depth + 1, node["path"], set(visited))
                if child_node:
                    children.append(child_node)

            # Apply in-tree sort to children
            if sort_metric:
                def sort_key(c: Dict[str, Any]):
                    val = c.get("metrics", {}).get(sort_metric)
                    return (val is not None, val if val is not None else float('-inf'))
                children.sort(key=sort_key, reverse=not sort_ascending)

            node["children"] = children

            # Rollup metrics from children
            for m in metrics:
                child_vals = [c["metrics"][m] for c in children if c["metrics"].get(m) is not None]
                if child_vals:
                    func_name = get_agg_for_metric(m)
                    if func_name == "sum":
                        rolled = sum(child_vals)
                    elif func_name in ("avg", "mean"):
                        rolled = sum(child_vals) / len(child_vals)
                    elif func_name == "min":
                        rolled = min(child_vals)
                    elif func_name == "max":
                        rolled = max(child_vals)
                    else:
                        rolled = sum(child_vals)
                    node["metrics"][m] = rolled
                    node["subtotals"][m] = rolled
        else:
            node["isLeaf"] = True
            node.pop("children", None)

        # Calculate Period Deltas if prior_period_df provided
        deltas: Dict[str, Optional[Dict[str, float]]] = {}
        if prior_period_df is not None and not prior_period_df.empty and id_col in prior_period_df.columns:
            prior_match = prior_period_df[prior_period_df[id_col].astype(str) == nid]
            for m in metrics:
                curr_val = node["metrics"].get(m)
                if curr_val is not None and m in prior_match.columns and not prior_match.empty:
                    prev_val = float(prior_match[m].sum())
                    diff = curr_val - prev_val
                    pct_change = (diff / prev_val * 100.0) if prev_val != 0 else 0.0
                    deltas[m] = {
                        "diff": diff,
                        "pct_change": pct_change,
                        "prev_val": prev_val,
                    }
        node["deltas"] = deltas

        return node

    root_nodes = []
    for rid in root_ids:
        assembled = assemble(rid, 0, [], set())
        if assembled:
            root_nodes.append(assembled)

    # Sort root nodes
    if sort_metric:
        def root_sort_key(r: Dict[str, Any]):
            val = r.get("metrics", {}).get(sort_metric)
            return (val is not None, val if val is not None else float('-inf'))
        root_nodes.sort(key=root_sort_key, reverse=not sort_ascending)

    return root_nodes

