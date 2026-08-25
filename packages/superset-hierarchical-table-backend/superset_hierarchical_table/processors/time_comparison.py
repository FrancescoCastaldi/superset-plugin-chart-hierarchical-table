from typing import List, Dict, Any, Optional, Tuple, Union
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


class TimeGrain:
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class ComparisonBaseline:
    PREV_PERIOD = "prev_period"
    PREV_YEAR_SAME_PERIOD = "prev_year_same_period"
    BUDGET_TARGET = "budget_target"


def compute_time_comparison(
    df: pd.DataFrame,
    date_col: str,
    time_grain: str = TimeGrain.YEAR,
    ref_period: str = "current",
    comp_baseline: str = ComparisonBaseline.PREV_PERIOD,
    dimensions: Optional[List[str]] = None,
    metrics: Optional[List[str]] = None,
    budget_df: Optional[pd.DataFrame] = None
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Splits a DataFrame into Reference Period and Comparison Baseline DataFrames,
    calculating period-over-period variance deltas across hierarchical dimensions.

    Returns:
        (ref_df, comp_df, metadata_dict)
    """
    if df.empty or date_col not in df.columns:
        return df, pd.DataFrame(), {"status": "no_date_col"}

    work_df = df.copy()
    work_df[date_col] = pd.to_datetime(work_df[date_col], errors="coerce")
    work_df = work_df.dropna(subset=[date_col])

    if work_df.empty:
        return df, pd.DataFrame(), {"status": "empty_dates"}

    max_date = work_df[date_col].max()
    min_date = work_df[date_col].min()

    # Determine reference date boundaries
    if time_grain == TimeGrain.DAY:
        ref_end = max_date
        ref_start = ref_end.replace(hour=0, minute=0, second=0)
        
        if comp_baseline == ComparisonBaseline.PREV_PERIOD:
            comp_start = ref_start - timedelta(days=1)
            comp_end = ref_end - timedelta(days=1)
        elif comp_baseline == ComparisonBaseline.PREV_YEAR_SAME_PERIOD:
            comp_start = ref_start - pd.DateOffset(years=1)
            comp_end = ref_end - pd.DateOffset(years=1)
        else:
            comp_start = ref_start - timedelta(days=1)
            comp_end = ref_end - timedelta(days=1)

    elif time_grain == TimeGrain.WEEK:
        # ISO week
        ref_end = max_date
        ref_start = ref_end - timedelta(days=ref_end.weekday())  # Start of current week (Monday)
        
        if comp_baseline == ComparisonBaseline.PREV_PERIOD:
            comp_start = ref_start - timedelta(weeks=1)
            comp_end = ref_end - timedelta(weeks=1)
        elif comp_baseline == ComparisonBaseline.PREV_YEAR_SAME_PERIOD:
            comp_start = ref_start - pd.DateOffset(years=1)
            comp_end = ref_end - pd.DateOffset(years=1)
        else:
            comp_start = ref_start - timedelta(weeks=1)
            comp_end = ref_end - timedelta(weeks=1)

    elif time_grain == TimeGrain.MONTH:
        ref_end = max_date
        ref_start = ref_end.replace(day=1)
        
        if comp_baseline == ComparisonBaseline.PREV_PERIOD:
            comp_start = (ref_start - timedelta(days=1)).replace(day=1)
            comp_end = ref_start - timedelta(days=1)
        elif comp_baseline == ComparisonBaseline.PREV_YEAR_SAME_PERIOD:
            comp_start = ref_start - pd.DateOffset(years=1)
            comp_end = ref_end - pd.DateOffset(years=1)
        else:
            comp_start = (ref_start - timedelta(days=1)).replace(day=1)
            comp_end = ref_start - timedelta(days=1)

    else:  # YEAR (Default)
        ref_end = max_date
        ref_start = ref_end.replace(month=1, day=1)
        
        if comp_baseline in (ComparisonBaseline.PREV_PERIOD, ComparisonBaseline.PREV_YEAR_SAME_PERIOD):
            comp_start = ref_start - pd.DateOffset(years=1)
            comp_end = ref_end - pd.DateOffset(years=1)
        else:
            comp_start = ref_start - pd.DateOffset(years=1)
            comp_end = ref_end - pd.DateOffset(years=1)

    ref_df = work_df[(work_df[date_col] >= ref_start) & (work_df[date_col] <= ref_end)]

    if comp_baseline == ComparisonBaseline.BUDGET_TARGET and budget_df is not None and not budget_df.empty:
        comp_df = budget_df.copy()
    else:
        comp_df = work_df[(work_df[date_col] >= comp_start) & (work_df[date_col] <= comp_end)]

    meta = {
        "time_grain": time_grain,
        "ref_start": str(ref_start),
        "ref_end": str(ref_end),
        "comp_baseline": comp_baseline,
        "comp_start": str(comp_start),
        "comp_end": str(comp_end),
        "ref_records": len(ref_df),
        "comp_records": len(comp_df),
    }

    return ref_df, comp_df, meta


def calculate_period_deltas(
    current_val: Optional[float],
    baseline_val: Optional[float]
) -> Dict[str, Optional[float]]:
    """
    Computes absolute difference and percentage growth between current value and comparison baseline.
    """
    if current_val is None or baseline_val is None:
        return {"diff": None, "pct_change": None, "baseline": baseline_val}

    diff = current_val - baseline_val
    if baseline_val == 0:
        pct_change = 100.0 if current_val > 0 else (-100.0 if current_val < 0 else 0.0)
    else:
        pct_change = (diff / abs(baseline_val)) * 100.0

    return {
        "diff": round(diff, 4),
        "pct_change": round(pct_change, 2),
        "baseline": baseline_val,
    }
