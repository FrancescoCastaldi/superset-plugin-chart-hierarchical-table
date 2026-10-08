import { PivotHeaderGroup, PivotRowTotalsPosition, PivotTimeDeltaMode, TableColumn } from '../types';
import { formatMetricValue } from '../utils/formatters';
import {
  PERIOD_DELTA_PCT_SUFFIX,
  PERIOD_DELTA_SUFFIX,
  TimeDeltaStrategyConfig,
} from '../utils/timeComparison';

export const HIERARCHY_COLUMN_KEY = '__hierarchy_tree__';
export const ROW_TOTALS_GROUP_KEY = '__pivot_row_totals__';
export const PERIOD_COMPARISON_GROUP_KEY = '__period_comparison__';

export interface ValueFormat {
  numberFormat: string;
  currencySymbol: string;
}

/**
 * Columns, header groups and the ordered list of metric keys (duplicates included)
 * that the grand total must aggregate.
 */
export interface ColumnLayout {
  columns: TableColumn[];
  pivotHeaderGroups: PivotHeaderGroup[];
  metricKeys: string[];
}

/**
 * Comparison operands (e.g. richieste_conf) are fetched to compute deltas but are not rendered
 * as their own column.
 */
export function isComparisonOperandMetric(metric: string): boolean {
  const m = metric.toLowerCase();
  return (
    (m.includes('confronto') || m.includes('conf')) &&
    !m.includes('delta') &&
    !m.includes('variazione')
  );
}

export function createMetricFormatter(format: ValueFormat, metricName: string) {
  return (val: any) => formatMetricValue(val, format.numberFormat, format.currencySymbol, metricName);
}

export function formatSignedPercent(val: any): string {
  return val === null || val === undefined ? '-' : `${val > 0 ? '+' : ''}${val}%`;
}

function includesAbsoluteDelta(mode: PivotTimeDeltaMode): boolean {
  return mode === 'absolute' || mode === 'both';
}

function includesPercentageDelta(mode: PivotTimeDeltaMode): boolean {
  return mode === 'percentage' || mode === 'both';
}

export function buildHierarchyColumn(hierarchyType: string, dimensions: string[]): TableColumn {
  return {
    key: HIERARCHY_COLUMN_KEY,
    title:
      hierarchyType === 'multi_dimension'
        ? dimensions.join(' / ') || 'Hierarchy'
        : 'Hierarchy Tree',
    dataIndex: 'name',
    isMetric: false,
    isHierarchyDimension: true,
    align: 'left',
    width: 320,
  };
}

function rowTotalsHeaderGroup(
  position: PivotRowTotalsPosition,
  label: string,
  rowTotalsCols: TableColumn[],
): PivotHeaderGroup | null {
  return position !== 'none' && rowTotalsCols.length > 0
    ? {
        title: label,
        key: ROW_TOTALS_GROUP_KEY,
        colSpan: rowTotalsCols.length,
      }
    : null;
}

/**
 * Non-pivot layout: one column per metric. Comparison operands are still aggregated.
 */
export function buildFlatColumns(metrics: string[], format: ValueFormat): ColumnLayout {
  const columns: TableColumn[] = [];
  const metricKeys: string[] = [];

  for (const m of metrics) {
    metricKeys.push(m);

    if (isComparisonOperandMetric(m)) {
      continue;
    }

    columns.push({
      key: m,
      title: m.endsWith('___delta') ? `Δ% ${m.replace('___delta', '')}` : m,
      dataIndex: m,
      isMetric: true,
      align: 'right',
      width: 160,
      formatter: createMetricFormatter(format, m),
    });
  }

  return { columns, pivotHeaderGroups: [], metricKeys };
}

export interface MultiPivotColumnsParams {
  metrics: string[];
  displayDim1Values: string[];
  dim2Values: string[];
  rowTotalsPosition: PivotRowTotalsPosition;
  rowTotalsLabel: string;
  showColumnSubtotals: boolean;
  columnSubtotalLabel: string;
  format: ValueFormat;
}

/**
 * Two pivot dimensions: first-level header per value of the 1st dimension with an optional
 * subtotal column, one column per value of the 2nd dimension, plus the row totals block.
 */
export function buildMultiPivotColumns({
  metrics,
  displayDim1Values,
  dim2Values,
  rowTotalsPosition,
  rowTotalsLabel,
  showColumnSubtotals,
  columnSubtotalLabel,
  format,
}: MultiPivotColumnsParams): ColumnLayout {
  const columns: TableColumn[] = [];
  const pivotHeaderGroups: PivotHeaderGroup[] = [];
  const metricKeys: string[] = [];

  const rowTotalsCols: TableColumn[] = [];
  if (rowTotalsPosition !== 'none') {
    for (const m of metrics) {
      if (isComparisonOperandMetric(m)) {
        continue;
      }

      if (showColumnSubtotals) {
        const rowTotalKey = `${m}___ROW_TOTAL`;
        metricKeys.push(rowTotalKey);
        rowTotalsCols.push({
          key: rowTotalKey,
          title: metrics.length > 1 ? `${columnSubtotalLabel} (${m})` : columnSubtotalLabel,
          dataIndex: rowTotalKey,
          isMetric: true,
          pivotValue: rowTotalsLabel,
          baseMetric: `${rowTotalsLabel} ${columnSubtotalLabel}`,
          align: 'right',
          width: 130,
          formatter: createMetricFormatter(format, m),
        });
      }

      for (const v2 of dim2Values) {
        const channelTotalKey = `${m}___ROW_TOTAL___${v2}`;
        metricKeys.push(channelTotalKey);
        rowTotalsCols.push({
          key: channelTotalKey,
          title: metrics.length > 1 ? `${v2} (${m})` : v2,
          dataIndex: channelTotalKey,
          isMetric: true,
          pivotValue: rowTotalsLabel,
          baseMetric: `${rowTotalsLabel} ${v2}`,
          align: 'right',
          width: 130,
          formatter: createMetricFormatter(format, m),
        });
      }
    }
  }

  const totalsGroup = rowTotalsHeaderGroup(rowTotalsPosition, rowTotalsLabel, rowTotalsCols);

  if (rowTotalsPosition === 'left' && totalsGroup) {
    pivotHeaderGroups.push(totalsGroup);
    columns.push(...rowTotalsCols);
  }

  for (const d1Val of displayDim1Values) {
    let subColsCount = 0;

    for (const m of metrics) {
      if (isComparisonOperandMetric(m)) {
        continue;
      }

      if (showColumnSubtotals) {
        const subtotalKey = `${m}___${d1Val}___SUBTOTAL`;
        metricKeys.push(subtotalKey);
        subColsCount++;
        columns.push({
          key: subtotalKey,
          title: metrics.length > 1 ? `${columnSubtotalLabel} (${m})` : columnSubtotalLabel,
          dataIndex: subtotalKey,
          isMetric: true,
          pivotValue: d1Val,
          baseMetric: `${d1Val} ${columnSubtotalLabel}`,
          align: 'right',
          width: 130,
          formatter: createMetricFormatter(format, m),
        });
      }

      for (const v2 of dim2Values) {
        const cellKey = `${m}___${d1Val}___${v2}`;
        metricKeys.push(cellKey);
        subColsCount++;
        columns.push({
          key: cellKey,
          title: metrics.length > 1 ? `${v2} (${m})` : v2,
          dataIndex: cellKey,
          isMetric: true,
          pivotValue: d1Val,
          baseMetric: `${d1Val} ${v2}`,
          align: 'right',
          width: 130,
          formatter: createMetricFormatter(format, m),
        });
      }
    }

    if (subColsCount > 0) {
      pivotHeaderGroups.push({
        title: d1Val,
        key: d1Val,
        colSpan: subColsCount,
      });
    }
  }

  if (rowTotalsPosition === 'right' && totalsGroup) {
    pivotHeaderGroups.push(totalsGroup);
    columns.push(...rowTotalsCols);
  }

  return { columns, pivotHeaderGroups, metricKeys };
}

export interface SinglePivotColumnsParams {
  metrics: string[];
  displayPivotValues: string[];
  combineMetric: boolean;
  rowTotalsPosition: PivotRowTotalsPosition;
  rowTotalsLabel: string;
  deltaMode: PivotTimeDeltaMode;
  format: ValueFormat;
}

function buildCombinedPivotColumns(
  {
    metrics,
    displayPivotValues,
    rowTotalsPosition,
    deltaMode,
    format,
  }: SinglePivotColumnsParams,
  rowTotalsCols: TableColumn[],
  totalsGroup: PivotHeaderGroup | null,
  layout: ColumnLayout,
): void {
  const { columns, pivotHeaderGroups, metricKeys } = layout;

  if (rowTotalsPosition === 'left' && totalsGroup) {
    pivotHeaderGroups.push(totalsGroup);
    columns.push(...rowTotalsCols);
  }

  for (const pVal of displayPivotValues) {
    let subColsCount = 0;

    for (const m of metrics) {
      if (isComparisonOperandMetric(m)) {
        continue;
      }

      const baseCompositeKey = `${m}___${pVal}`;
      metricKeys.push(baseCompositeKey);
      subColsCount++;

      columns.push({
        key: baseCompositeKey,
        title: m,
        dataIndex: baseCompositeKey,
        isMetric: true,
        pivotValue: pVal,
        baseMetric: m,
        align: 'right',
        width: 130,
        formatter: createMetricFormatter(format, m),
      });

      if (includesAbsoluteDelta(deltaMode)) {
        const deltaKey = `${m}___delta___${pVal}`;
        metricKeys.push(deltaKey);
        subColsCount++;

        columns.push({
          key: deltaKey,
          title: metrics.length > 1 ? `Δ ${m}` : 'Delta',
          dataIndex: deltaKey,
          isMetric: true,
          pivotValue: pVal,
          baseMetric: `${m} Delta`,
          align: 'right',
          width: 120,
          formatter: createMetricFormatter(format, 'delta'),
        });
      }

      if (includesPercentageDelta(deltaMode)) {
        const deltaPctKey = `${m}___delta_pct___${pVal}`;
        metricKeys.push(deltaPctKey);
        subColsCount++;

        columns.push({
          key: deltaPctKey,
          title: metrics.length > 1 ? `Δ% ${m}` : 'Δ%',
          dataIndex: deltaPctKey,
          isMetric: true,
          pivotValue: pVal,
          baseMetric: `${m} Δ%`,
          align: 'right',
          width: 110,
          formatter: formatSignedPercent,
        });
      }
    }

    if (subColsCount > 0) {
      pivotHeaderGroups.push({
        title: pVal,
        key: pVal,
        colSpan: subColsCount,
      });
    }
  }

  if (rowTotalsPosition === 'right' && totalsGroup) {
    pivotHeaderGroups.push(totalsGroup);
    columns.push(...rowTotalsCols);
  }
}

function buildSeparatedPivotColumns(
  {
    metrics,
    displayPivotValues,
    rowTotalsPosition,
    rowTotalsLabel,
    deltaMode,
    format,
  }: SinglePivotColumnsParams,
  layout: ColumnLayout,
): void {
  const { columns, pivotHeaderGroups, metricKeys } = layout;

  const rowTotalColumn = (m: string): TableColumn => {
    const rowTotalKey = `${m}___ROW_TOTAL`;
    metricKeys.push(rowTotalKey);
    return {
      key: rowTotalKey,
      title: rowTotalsLabel,
      dataIndex: rowTotalKey,
      isMetric: true,
      pivotValue: rowTotalsLabel,
      baseMetric: `${rowTotalsLabel} ${m}`,
      align: 'right',
      width: 140,
      formatter: createMetricFormatter(format, m),
    };
  };

  for (const m of metrics) {
    if (isComparisonOperandMetric(m)) {
      continue;
    }

    const hasRowTotal = rowTotalsPosition !== 'none';
    pivotHeaderGroups.push({
      title: m,
      key: m,
      colSpan: displayPivotValues.length + (hasRowTotal ? 1 : 0),
    });

    if (rowTotalsPosition === 'left') {
      columns.push(rowTotalColumn(m));
    }

    for (const pVal of displayPivotValues) {
      const compositeKey = `${m}___${pVal}`;
      metricKeys.push(compositeKey);

      columns.push({
        key: compositeKey,
        title: pVal,
        dataIndex: compositeKey,
        isMetric: true,
        pivotValue: pVal,
        baseMetric: m,
        align: 'right',
        width: 140,
        formatter: createMetricFormatter(format, m),
      });
    }

    if (rowTotalsPosition === 'right') {
      columns.push(rowTotalColumn(m));
    }

    if (includesAbsoluteDelta(deltaMode)) {
      pivotHeaderGroups.push({
        title: `Delta ${m}`,
        key: `delta___${m}`,
        colSpan: displayPivotValues.length,
      });

      for (const pVal of displayPivotValues) {
        const deltaKey = `${m}___delta___${pVal}`;
        metricKeys.push(deltaKey);

        columns.push({
          key: deltaKey,
          title: pVal,
          dataIndex: deltaKey,
          isMetric: true,
          pivotValue: pVal,
          baseMetric: `${m} Delta`,
          align: 'right',
          width: 120,
          formatter: createMetricFormatter(format, 'delta'),
        });
      }
    }

    if (includesPercentageDelta(deltaMode)) {
      pivotHeaderGroups.push({
        title: `Δ% ${m}`,
        key: `delta_pct___${m}`,
        colSpan: displayPivotValues.length,
      });

      for (const pVal of displayPivotValues) {
        const deltaPctKey = `${m}___delta_pct___${pVal}`;
        metricKeys.push(deltaPctKey);

        columns.push({
          key: deltaPctKey,
          title: pVal,
          dataIndex: deltaPctKey,
          isMetric: true,
          pivotValue: pVal,
          baseMetric: `${m} Δ%`,
          align: 'right',
          width: 110,
          formatter: formatSignedPercent,
        });
      }
    }
  }
}

function periodComparisonTitle({ strategy, referencePeriod }: TimeDeltaStrategyConfig): string {
  if (strategy === 'budget_target') return 'Δ vs budget target';
  if (strategy === 'prev_year_same_period') return 'Δ vs same period last year';
  return referencePeriod === 'ytd' ? 'Δ vs YTD average' : 'Δ vs previous period';
}

/**
 * Appends, after every other column, the absolute and percentage delta of the current period
 * against the baseline of the time comparison strategy, under one header group.
 */
export function appendPeriodComparisonColumns(
  layout: ColumnLayout,
  metrics: string[],
  config: TimeDeltaStrategyConfig,
  format: ValueFormat,
): void {
  const multiple = metrics.length > 1;
  let count = 0;
  for (const m of metrics) {
    if (isComparisonOperandMetric(m)) continue;
    const deltaKey = `${m}${PERIOD_DELTA_SUFFIX}`;
    const deltaPctKey = `${m}${PERIOD_DELTA_PCT_SUFFIX}`;
    layout.metricKeys.push(deltaKey, deltaPctKey);
    layout.columns.push(
      {
        key: deltaKey,
        title: multiple ? `Δ ${m}` : 'Δ',
        dataIndex: deltaKey,
        isMetric: true,
        baseMetric: `${m} Δ period`,
        align: 'right',
        width: 120,
        formatter: createMetricFormatter(format, 'delta'),
      },
      {
        key: deltaPctKey,
        title: multiple ? `Δ% ${m}` : 'Δ%',
        dataIndex: deltaPctKey,
        isMetric: true,
        baseMetric: `${m} Δ% period`,
        align: 'right',
        width: 110,
        formatter: formatSignedPercent,
      },
    );
    count += 2;
  }
  if (count > 0) {
    layout.pivotHeaderGroups.push({
      title: periodComparisonTitle(config),
      key: PERIOD_COMPARISON_GROUP_KEY,
      colSpan: count,
    });
  }
}

/**
 * One pivot dimension (or several joined into one composite key): either the combined layout
 * (pivot value -> metrics/deltas) or the separated layout (metric -> pivot values).
 */
export function buildSinglePivotColumns(params: SinglePivotColumnsParams): ColumnLayout {
  const { metrics, rowTotalsPosition, rowTotalsLabel, format } = params;
  const layout: ColumnLayout = { columns: [], pivotHeaderGroups: [], metricKeys: [] };

  // The row totals keys are registered for both layouts (the separated layout registers
  // them again next to each metric): the grand total aggregates the resulting list as is.
  const rowTotalsCols: TableColumn[] = [];
  if (rowTotalsPosition !== 'none') {
    for (const m of metrics) {
      if (isComparisonOperandMetric(m)) {
        continue;
      }

      const rowTotalKey = `${m}___ROW_TOTAL`;
      layout.metricKeys.push(rowTotalKey);

      rowTotalsCols.push({
        key: rowTotalKey,
        title: m,
        dataIndex: rowTotalKey,
        isMetric: true,
        pivotValue: rowTotalsLabel,
        baseMetric: `${rowTotalsLabel} ${m}`,
        align: 'right',
        width: 130,
        formatter: createMetricFormatter(format, m),
      });
    }
  }

  const totalsGroup = rowTotalsHeaderGroup(rowTotalsPosition, rowTotalsLabel, rowTotalsCols);

  if (params.combineMetric) {
    buildCombinedPivotColumns(params, rowTotalsCols, totalsGroup, layout);
  } else {
    buildSeparatedPivotColumns(params, layout);
  }

  return layout;
}
