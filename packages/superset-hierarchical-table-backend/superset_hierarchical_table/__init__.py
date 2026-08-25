"""
Apache Superset Hierarchical Table - Backend Companion Package
"""

__version__ = "0.2.0"

from .processors.tree_aggregator import aggregate_hierarchical_dataframe, rollup_dataframe, export_hierarchy_to_records
from .processors.parent_child import resolve_parent_child_hierarchy
from .processors.time_comparison import compute_time_comparison, calculate_period_deltas, TimeGrain, ComparisonBaseline
from .queries.sql_builder import build_recursive_cte_query, build_time_comparison_cte_query

__all__ = [
    "aggregate_hierarchical_dataframe",
    "rollup_dataframe",
    "export_hierarchy_to_records",
    "resolve_parent_child_hierarchy",
    "compute_time_comparison",
    "calculate_period_deltas",
    "TimeGrain",
    "ComparisonBaseline",
    "build_recursive_cte_query",
    "build_time_comparison_cte_query",
]

