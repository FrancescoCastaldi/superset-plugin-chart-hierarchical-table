import { TreeNode, AggregationFunction } from '../types';

/**
 * Calculates aggregate values for a list of child numbers based on the aggregation function.
 */
export function calculateAggregation(
  values: number[],
  aggFunc: AggregationFunction = 'sum',
): number | null {
  if (!values || values.length === 0) return null;

  switch (aggFunc) {
    case 'sum':
      return values.reduce((acc, curr) => acc + curr, 0);
    case 'avg':
      return values.reduce((acc, curr) => acc + curr, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'count':
      return values.length;
    default:
      return values.reduce((acc, curr) => acc + curr, 0);
  }
}

/**
 * Checks if a metric is a derived percentage/ratio metric that should not be summed.
 */
export function isDerivedMetric(metricName: string): boolean {
  const m = metricName.toLowerCase();
  return (
    m.includes('delta') ||
    m.includes('pct') ||
    m.includes('percent') ||
    m.includes('tasso')
  );
}

/**
 * Checks if a metric is an average or rate that should use weighted average rather than sum.
 */
export function isRateMetric(metricName: string): boolean {
  const m = metricName.toLowerCase();
  return (
    m.includes('lt_off') ||
    m.includes('acc_corr') ||
    m.includes('acc_conf') ||
    m.includes('attesa')
  );
}

/**
 * Helper to extract base metric and pivot suffix (e.g. 'delta_richieste_pct___SSN' -> base: 'delta_richieste_pct', pivot: '___SSN')
 */
function splitMetricKey(key: string): { base: string; suffix: string } {
  const pivotIdx = key.indexOf('___');
  if (pivotIdx !== -1) {
    return {
      base: key.substring(0, pivotIdx),
      suffix: key.substring(pivotIdx),
    };
  }
  return { base: key, suffix: '' };
}

/**
 * Recomputes derived metrics for a node (leaf, parent, or grand total) based on its base metrics.
 */
export function recomputeDerivedMetrics(
  metrics: Record<string, number | string | null>,
  allMetricKeys: string[],
): void {
  for (const key of allMetricKeys) {
    const { base, suffix } = splitMetricKey(key);
    const mLower = base.toLowerCase();

    // 1. Delta Richieste Percentage
    if (
      mLower.includes('delta') &&
      (mLower.includes('richieste') || mLower.includes('pct') || mLower.includes('diff'))
    ) {
      const corrKey = `richieste_corr${suffix}`;
      const confKey = `richieste_conf${suffix}`;

      const rawCorr = metrics[corrKey];
      const rawConf = metrics[confKey];

      if (rawCorr !== undefined || rawConf !== undefined) {
        const corr = typeof rawCorr === 'number' ? rawCorr : 0;
        const conf = typeof rawConf === 'number' ? rawConf : 0;

        if (conf > 0) {
          metrics[key] = Math.round(((corr - conf) * 1000.0) / conf) / 10;
        } else if (conf === 0 && corr > 0) {
          metrics[key] = 'Nuovo';
        } else if (conf === 0 && corr === 0) {
          metrics[key] = null;
        } else {
          metrics[key] = null;
        }
      }
    }

    // 2. Prime Visite Percentage
    else if (mLower.includes('pct') && mLower.includes('prime_visite')) {
      const pvKey = `prime_visite${suffix}`;
      const totKey = `richieste_corr${suffix}`;
      const ctrlKey = `controlli${suffix}`;

      const pv = typeof metrics[pvKey] === 'number' ? (metrics[pvKey] as number) : 0;
      const tot = typeof metrics[totKey] === 'number' ? (metrics[totKey] as number) : 0;
      const ctrl = typeof metrics[ctrlKey] === 'number' ? (metrics[ctrlKey] as number) : 0;

      const denom = tot > 0 ? tot : pv + ctrl;
      if (denom > 0) {
        metrics[key] = Math.round((pv * 1000.0) / denom) / 10;
      } else {
        metrics[key] = null;
      }
    }

    // 3. Delta Acceptance (delta_acc = acc_corr - acc_conf)
    else if (mLower.includes('delta') && mLower.includes('acc')) {
      const accCorrKey = `acc_corr${suffix}`;
      const accConfKey = `acc_conf${suffix}`;

      const rawAccCorr = metrics[accCorrKey];
      const rawAccConf = metrics[accConfKey];

      if (typeof rawAccCorr === 'number' && typeof rawAccConf === 'number') {
        metrics[key] = Math.round((rawAccCorr - rawAccConf) * 10) / 10;
      } else if (typeof rawAccCorr === 'number') {
        metrics[key] = Math.round(rawAccCorr * 10) / 10;
      } else {
        metrics[key] = null;
      }
    }

    // 4. Delta Lead Time (delta_lt_off = lt_off_corr - lt_off_conf)
    else if (mLower.includes('delta') && (mLower.includes('lt') || mLower.includes('attesa'))) {
      const ltCorrKey = `lt_off_corr${suffix}`;
      const ltConfKey = `lt_off_conf${suffix}`;

      const rawLtCorr = metrics[ltCorrKey];
      const rawLtConf = metrics[ltConfKey];

      if (typeof rawLtCorr === 'number' && typeof rawLtConf === 'number') {
        metrics[key] = Math.round((rawLtCorr - rawLtConf) * 10) / 10;
      } else if (typeof rawLtCorr === 'number') {
        metrics[key] = Math.round(rawLtCorr * 10) / 10;
      } else {
        metrics[key] = null;
      }
    }
  }
}

/**
 * Recursively rolls up metric calculations from leaves to parent nodes.
 */
export function rollupTreeMetrics(
  nodes: TreeNode[],
  metricNames: string[],
  aggFunc: AggregationFunction = 'sum',
): void {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      // Rollup children first (post-order traversal)
      rollupTreeMetrics(node.children, metricNames, aggFunc);

      // Aggregate each metric for the current parent node
      for (const metric of metricNames) {
        // Derived percentage/delta metrics will be recalculated afterwards, skip direct sum
        if (isDerivedMetric(metric)) {
          continue;
        }

        // For rate/average metrics, compute weighted average using volume if possible
        if (isRateMetric(metric)) {
          const { suffix } = splitMetricKey(metric);
          const weightKey = metric.toLowerCase().includes('conf')
            ? `richieste_conf${suffix}`
            : `richieste_corr${suffix}`;

          let weightedSum = 0;
          let totalWeight = 0;
          let unweightedSum = 0;
          let count = 0;

          for (const child of node.children) {
            const val = child.metrics[metric];
            if (typeof val === 'number' && !isNaN(val)) {
              const weight =
                typeof child.metrics[weightKey] === 'number'
                  ? (child.metrics[weightKey] as number)
                  : 0;
              if (weight > 0) {
                weightedSum += val * weight;
                totalWeight += weight;
              }
              unweightedSum += val;
              count++;
            }
          }

          let rateVal: number | null = null;
          if (totalWeight > 0) {
            rateVal = Math.round((weightedSum / totalWeight) * 10) / 10;
          } else if (count > 0) {
            rateVal = Math.round((unweightedSum / count) * 10) / 10;
          }

          node.metrics[metric] = rateVal;
          if (!node.subtotals) node.subtotals = {};
          node.subtotals[metric] = rateVal;
          continue;
        }

        // Standard additive metric (e.g. volume, count)
        const childMetricValues: number[] = [];
        for (const child of node.children) {
          const val = child.metrics[metric];
          if (typeof val === 'number' && !isNaN(val)) {
            childMetricValues.push(val);
          }
        }

        const aggregatedVal = calculateAggregation(childMetricValues, aggFunc);
        node.metrics[metric] = aggregatedVal;
        if (!node.subtotals) {
          node.subtotals = {};
        }
        node.subtotals[metric] = aggregatedVal;
      }

      // Recalculate derived metrics on parent node from its aggregated totals
      recomputeDerivedMetrics(node.metrics, metricNames);
      if (node.subtotals) {
        recomputeDerivedMetrics(node.subtotals, metricNames);
      }
    } else {
      // Leaf node: ensure derived metrics are cleanly computed (e.g. 'Nuovo' when conf === 0)
      recomputeDerivedMetrics(node.metrics, metricNames);
      if (node.subtotals) {
        recomputeDerivedMetrics(node.subtotals, metricNames);
      }
    }
  }
}

/**
 * Computes a Grand Total node aggregating all top-level roots.
 */
export function computeGrandTotal(
  rootNodes: TreeNode[],
  metricNames: string[],
  aggFunc: AggregationFunction = 'sum',
): TreeNode {
  const grandTotalMetrics: Record<string, number | string | null> = {};

  for (const metric of metricNames) {
    if (isDerivedMetric(metric)) {
      continue;
    }

    if (isRateMetric(metric)) {
      const { suffix } = splitMetricKey(metric);
      const weightKey = metric.toLowerCase().includes('conf')
        ? `richieste_conf${suffix}`
        : `richieste_corr${suffix}`;

      let weightedSum = 0;
      let totalWeight = 0;
      let unweightedSum = 0;
      let count = 0;

      for (const root of rootNodes) {
        const val = root.metrics[metric];
        if (typeof val === 'number' && !isNaN(val)) {
          const weight =
            typeof root.metrics[weightKey] === 'number'
              ? (root.metrics[weightKey] as number)
              : 0;
          if (weight > 0) {
            weightedSum += val * weight;
            totalWeight += weight;
          }
          unweightedSum += val;
          count++;
        }
      }

      if (totalWeight > 0) {
        grandTotalMetrics[metric] = Math.round((weightedSum / totalWeight) * 10) / 10;
      } else if (count > 0) {
        grandTotalMetrics[metric] = Math.round((unweightedSum / count) * 10) / 10;
      } else {
        grandTotalMetrics[metric] = null;
      }
      continue;
    }

    const rootValues: number[] = [];
    for (const root of rootNodes) {
      const val = root.metrics[metric];
      if (typeof val === 'number' && !isNaN(val)) {
        rootValues.push(val);
      }
    }
    grandTotalMetrics[metric] = calculateAggregation(rootValues, aggFunc);
  }

  // Recalculate derived metrics for Grand Total
  recomputeDerivedMetrics(grandTotalMetrics, metricNames);

  return {
    key: '__grand_total__',
    id: '__grand_total__',
    name: 'Grand Total',
    depth: 0,
    path: ['Grand Total'],
    isLeaf: true,
    metrics: grandTotalMetrics,
    subtotals: grandTotalMetrics,
  };
}
