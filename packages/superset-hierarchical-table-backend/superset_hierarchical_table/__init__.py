"""
Apache Superset Hierarchical Table - Backend Companion Package
"""

__version__ = "0.1.0"

from .processors.tree_aggregator import aggregate_hierarchical_dataframe, rollup_dataframe
from .processors.parent_child import resolve_parent_child_hierarchy
from .queries.sql_builder import build_recursive_cte_query

__all__ = [
    "aggregate_hierarchical_dataframe",
    "rollup_dataframe",
    "resolve_parent_child_hierarchy",
    "build_recursive_cte_query",
]
