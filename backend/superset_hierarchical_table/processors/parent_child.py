from typing import List, Dict, Any, Optional, Set
import pandas as pd


def resolve_parent_child_hierarchy(
    df: pd.DataFrame,
    id_col: str,
    parent_id_col: str,
    label_col: Optional[str],
    metrics: List[str],
    agg_func: str = "sum"
) -> List[Dict[str, Any]]:
    """
    Transforms a parent-child adjacency list DataFrame into a nested tree structure
    with rolled up metrics and depth calculation.
    """
    if df.empty or id_col not in df.columns:
        return []

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
            "children": [],
        }

        if parent_id not in parent_to_children:
            parent_to_children[parent_id] = []
        parent_to_children[parent_id].append(node_id)

    # Roots are nodes whose parent_id is None or not present in all_ids
    root_ids = [nid for nid in all_ids if (nid not in node_dict or parent_to_children.get(nid) is None and any(nid in children for p, children in parent_to_children.items() if p is None or p not in all_ids))]
    
    # Simpler root detection:
    root_ids = []
    for nid, node_data in node_dict.items():
        # Find if this node has a parent in all_ids
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
            node["children"] = children

            # Rollup metrics from children
            for m in metrics:
                child_vals = [c["metrics"][m] for c in children if c["metrics"].get(m) is not None]
                if child_vals:
                    if agg_func == "sum":
                        rolled = sum(child_vals)
                    elif agg_func == "avg":
                        rolled = sum(child_vals) / len(child_vals)
                    elif agg_func == "min":
                        rolled = min(child_vals)
                    elif agg_func == "max":
                        rolled = max(child_vals)
                    else:
                        rolled = sum(child_vals)
                    node["metrics"][m] = rolled
                    node["subtotals"][m] = rolled
        else:
            node["isLeaf"] = True
            node.pop("children", None)

        return node

    root_nodes = []
    for rid in root_ids:
        assembled = assemble(rid, 0, [], set())
        if assembled:
            root_nodes.append(assembled)

    return root_nodes
