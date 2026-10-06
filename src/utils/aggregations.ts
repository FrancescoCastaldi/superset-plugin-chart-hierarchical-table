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
    m.includes('diff') ||
    m.includes('variazione') ||
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
    m.includes('attesa') ||
    m.includes('accettazione') ||
    m.includes('tasso') ||
    (m.includes('%') && !m.includes('delta') && !m.includes('variazione') && !m.includes('diff'))
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
 * Helper to find matching current and comparison metric keys for a given topic/domain.
 */
function findMetricPair(
  allMetricKeys: string[],
  domainKeywords: string[],
  suffix: string,
  fallbackCorr: string,
  fallbackConf: string,
): { corrKey: string; confKey: string } {
  const isExcluded = (k: string) => {
    const l = k.toLowerCase();
    return l.includes('delta') || l.includes('variazione') || l.includes('diff');
  };

  const matchesDomain = (k: string) => {
    const l = k.toLowerCase();
    return domainKeywords.some(kw => l.includes(kw));
  };

  const corrKey =
    allMetricKeys.find(
      k =>
        k.endsWith(suffix) &&
        matchesDomain(k) &&
        (k.toLowerCase().includes('corr') || k.toLowerCase().includes('corrente')) &&
        !isExcluded(k),
    ) || fallbackCorr;

  const confKey =
    allMetricKeys.find(
      k =>
        k.endsWith(suffix) &&
        matchesDomain(k) &&
        (k.toLowerCase().includes('conf') || k.toLowerCase().includes('confronto')) &&
        !isExcluded(k),
    ) || fallbackConf;

  return { corrKey, confKey };
}

/**
 * Calculates percentage variation between current and comparison values:
 * ((corr - conf) * 100) / conf
 */
function computePercentageVariation(
  metrics: Record<string, number | string | null>,
  key: string,
  corrKey: string,
  confKey: string,
): void {
  const rawCorr = metrics[corrKey];
  const rawConf = metrics[confKey];

  if (typeof rawCorr === 'number' && typeof rawConf === 'number') {
    if (rawConf > 0) {
      metrics[key] = Math.round(((rawCorr - rawConf) * 1000.0) / rawConf) / 10;
    } else if (rawConf === 0 && rawCorr > 0) {
      metrics[key] = 'Nuovo';
    } else if (rawConf === 0 && rawCorr === 0) {
      metrics[key] = 0;
    } else {
      metrics[key] = null;
    }
  } else if (typeof rawCorr === 'number' && rawConf === 0) {
    if (rawCorr > 0) {
      metrics[key] = 'Nuovo';
    } else {
      metrics[key] = 0;
    }
  } else if (metrics[key] === undefined) {
    metrics[key] = null;
  }
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

    // 1. Delta / Variazione Richieste (Percentage)
    if (
      (mLower.includes('delta') || mLower.includes('variazione') || mLower.includes('diff')) &&
      (mLower.includes('richieste') || mLower.includes('volume'))
    ) {
      const { corrKey, confKey } = findMetricPair(
        allMetricKeys,
        ['richieste', 'volume'],
        suffix,
        `richieste_corr${suffix}`,
        `richieste_conf${suffix}`,
      );
      computePercentageVariation(metrics, key, corrKey, confKey);
    }

    // 1a. Delta / Variazione Accesso Diretto (Percentage)
    else if (
      (mLower.includes('delta') || mLower.includes('variazione') || mLower.includes('diff')) &&
      (mLower.includes('accesso') || mLower.includes('diretto'))
    ) {
      const { corrKey, confKey } = findMetricPair(
        allMetricKeys,
        ['accesso', 'diretto'],
        suffix,
        `accesso_diretto${suffix}`,
        `accesso_diretto_conf${suffix}`,
      );
      computePercentageVariation(metrics, key, corrKey, confKey);
    }

    // 1b. Delta / Variazione Programmata (Percentage)
    else if (
      (mLower.includes('delta') || mLower.includes('variazione') || mLower.includes('diff')) &&
      (mLower.includes('programmata') || mLower.includes('programmazione'))
    ) {
      const { corrKey, confKey } = findMetricPair(
        allMetricKeys,
        ['programmata', 'programmazione'],
        suffix,
        `programmata${suffix}`,
        `programmata_conf${suffix}`,
      );
      computePercentageVariation(metrics, key, corrKey, confKey);
    }

    // 1c. Delta / Variazione Prime Visite (Percentage)
    else if (
      (mLower.includes('delta') || mLower.includes('variazione') || mLower.includes('diff')) &&
      (mLower.includes('prime') || mLower.includes('visite')) &&
      !mLower.includes('su totale') &&
      !mLower.includes('% su')
    ) {
      const { corrKey, confKey } = findMetricPair(
        allMetricKeys,
        ['prime', 'visite'],
        suffix,
        `prime_visite${suffix}`,
        `prime_visite_conf${suffix}`,
      );
      computePercentageVariation(metrics, key, corrKey, confKey);
    }

    // 1d. Delta / Variazione Controlli (Percentage)
    else if (
      (mLower.includes('delta') || mLower.includes('variazione') || mLower.includes('diff')) &&
      mLower.includes('controlli')
    ) {
      const { corrKey, confKey } = findMetricPair(
        allMetricKeys,
        ['controlli'],
        suffix,
        `controlli${suffix}`,
        `controlli_conf${suffix}`,
      );
      computePercentageVariation(metrics, key, corrKey, confKey);
    }

    // 1e. Generic fallback: delta_X_pct — derive operand keys from metric name
    else if (mLower.startsWith('delta_') && mLower.endsWith('_pct')) {
      const baseName = mLower.slice(6, -4);
      const corrKey = `${baseName}${suffix}`;
      const confKey = `${baseName}_conf${suffix}`;
      computePercentageVariation(metrics, key, corrKey, confKey);
    }

    // 2. Prime Visite Ratio (% su totale richieste, non delta confronto)
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

    // 3. Delta Acceptance (delta_acc = acc_corr - acc_conf) in p.p.
    else if (
      (mLower.includes('delta') || mLower.includes('variazione') || mLower.includes('diff')) &&
      (mLower.includes('acc') || mLower.includes('accettazione'))
    ) {
      const accCorrKey =
        allMetricKeys.find(
          k =>
            k.endsWith(suffix) &&
            (k.toLowerCase().includes('acc') || k.toLowerCase().includes('accettazione')) &&
            (k.toLowerCase().includes('corr') || k.toLowerCase().includes('1ª') || k.toLowerCase().includes('1a')) &&
            !k.toLowerCase().includes('delta') &&
            !k.toLowerCase().includes('diff') &&
            !k.toLowerCase().includes('conf'),
        ) || `acc_corr${suffix}`;

      const accConfKey =
        allMetricKeys.find(
          k =>
            k.endsWith(suffix) &&
            (k.toLowerCase().includes('acc') || k.toLowerCase().includes('accettazione')) &&
            (k.toLowerCase().includes('conf') || k.toLowerCase().includes('confronto')) &&
            !k.toLowerCase().includes('delta') &&
            !k.toLowerCase().includes('diff') &&
            !k.toLowerCase().includes('corr'),
        ) || `acc_conf${suffix}`;

      const rawAccCorr = metrics[accCorrKey];
      const rawAccConf = metrics[accConfKey];

      if (typeof rawAccCorr === 'number' && typeof rawAccConf === 'number') {
        metrics[key] = Math.round((rawAccCorr - rawAccConf) * 10) / 10;
      } else if (metrics[key] === undefined) {
        metrics[key] = null;
      }
    }

    // 4. Delta Lead Time (delta_lt_off = lt_off_corr - lt_off_conf) in gg
    else if (
      (mLower.includes('delta') || mLower.includes('variazione') || mLower.includes('diff')) &&
      (mLower.includes('attesa') || mLower.includes('lt_off') || mLower.includes('lead') || (mLower.includes('giorni') && !mLower.includes('settimana'))) &&
      !mLower.includes('acc')
    ) {
      const ltCorrKey =
        allMetricKeys.find(
          k =>
            k.endsWith(suffix) &&
            (k.toLowerCase().includes('attesa') || k.toLowerCase().includes('lt_off') || k.toLowerCase().includes('lead')) &&
            (k.toLowerCase().includes('corr') || k.toLowerCase().includes('media')) &&
            !k.toLowerCase().includes('delta') &&
            !k.toLowerCase().includes('diff') &&
            !k.toLowerCase().includes('conf'),
        ) || `lt_off_corr${suffix}`;

      const ltConfKey =
        allMetricKeys.find(
          k =>
            k.endsWith(suffix) &&
            (k.toLowerCase().includes('attesa') || k.toLowerCase().includes('lt_off') || k.toLowerCase().includes('lead')) &&
            (k.toLowerCase().includes('conf') || k.toLowerCase().includes('confronto')) &&
            !k.toLowerCase().includes('delta') &&
            !k.toLowerCase().includes('diff') &&
            !k.toLowerCase().includes('corr'),
        ) || `lt_off_conf${suffix}`;

      const rawLtCorr = metrics[ltCorrKey];
      const rawLtConf = metrics[ltConfKey];

      if (typeof rawLtCorr === 'number' && typeof rawLtConf === 'number') {
        metrics[key] = Math.round((rawLtCorr - rawLtConf) * 10) / 10;
      } else if (metrics[key] === undefined) {
        metrics[key] = null;
      }
    }

    // 5. Generic fallback for ANY percentage variation
    else if (
      (mLower.includes('delta') || mLower.includes('variazione') || mLower.includes('diff')) &&
      (mLower.includes('%') || mLower.includes('pct') || mLower.includes('percent'))
    ) {
      const corrKey =
        allMetricKeys.find(
          k =>
            k.endsWith(suffix) &&
            (k.toLowerCase().includes('corr') || k.toLowerCase().includes('corrente')) &&
            !k.toLowerCase().includes('delta') &&
            !k.toLowerCase().includes('variazione') &&
            !k.toLowerCase().includes('diff'),
        );
      const confKey =
        allMetricKeys.find(
          k =>
            k.endsWith(suffix) &&
            (k.toLowerCase().includes('conf') || k.toLowerCase().includes('confronto')) &&
            !k.toLowerCase().includes('delta') &&
            !k.toLowerCase().includes('variazione') &&
            !k.toLowerCase().includes('diff'),
        );
      if (corrKey && confKey) {
        computePercentageVariation(metrics, key, corrKey, confKey);
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
          const isConf = metric.toLowerCase().includes('conf') || metric.toLowerCase().includes('confronto');
          const weightKey =
            metricNames.find(
              k =>
                (k.toLowerCase().includes('richieste') || k.toLowerCase().includes('volume')) &&
                (isConf
                  ? k.toLowerCase().includes('conf') || k.toLowerCase().includes('confronto')
                  : k.toLowerCase().includes('corr') || k.toLowerCase().includes('corrente')),
            ) || (isConf ? `richieste_conf${suffix}` : `richieste_corr${suffix}`);

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

      // Fallback: for any derived metrics still missing (e.g. table without comparison column),
      // compute a weighted average from children using a volume metric if available, else simple average.
      for (const metric of metricNames) {
        if (isDerivedMetric(metric) && (node.metrics[metric] === null || node.metrics[metric] === undefined)) {
          const { suffix } = splitMetricKey(metric);
          const weightKey =
            metricNames.find(
              k =>
                (k.toLowerCase().includes('richieste') || k.toLowerCase().includes('volume') || k.toLowerCase().includes('corr')) &&
                !isDerivedMetric(k),
            ) || `richieste_corr${suffix}`;

          let weightedSum = 0;
          let totalWeight = 0;
          let unweightedSum = 0;
          let count = 0;

          for (const child of node.children) {
            const cVal = child.metrics[metric];
            if (typeof cVal === 'number' && !isNaN(cVal)) {
              const weight =
                typeof child.metrics[weightKey] === 'number'
                  ? (child.metrics[weightKey] as number)
                  : 0;
              if (weight > 0) {
                weightedSum += cVal * weight;
                totalWeight += weight;
              }
              unweightedSum += cVal;
              count++;
            }
          }

          let derivedVal: number | null = null;
          if (totalWeight > 0) {
            derivedVal = Math.round((weightedSum / totalWeight) * 10) / 10;
          } else if (count > 0) {
            derivedVal = Math.round((unweightedSum / count) * 10) / 10;
          }

          if (derivedVal !== null) {
            node.metrics[metric] = derivedVal;
            if (node.subtotals) node.subtotals[metric] = derivedVal;
          }
        }
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

  for (const metric of metricNames) {
    if (isDerivedMetric(metric) && (grandTotalMetrics[metric] === null || grandTotalMetrics[metric] === undefined)) {
      const { suffix } = splitMetricKey(metric);
      const weightKey =
        metricNames.find(
          k =>
            (k.toLowerCase().includes('richieste') || k.toLowerCase().includes('volume') || k.toLowerCase().includes('corr')) &&
            !isDerivedMetric(k),
        ) || `richieste_corr${suffix}`;

      let weightedSum = 0;
      let totalWeight = 0;
      let unweightedSum = 0;
      let count = 0;

      for (const root of rootNodes) {
        const rVal = root.metrics[metric];
        if (typeof rVal === 'number' && !isNaN(rVal)) {
          const weight =
            typeof root.metrics[weightKey] === 'number'
              ? (root.metrics[weightKey] as number)
              : 0;
          if (weight > 0) {
            weightedSum += rVal * weight;
            totalWeight += weight;
          }
          unweightedSum += rVal;
          count++;
        }
      }

      if (totalWeight > 0) {
        grandTotalMetrics[metric] = Math.round((weightedSum / totalWeight) * 10) / 10;
      } else if (count > 0) {
        grandTotalMetrics[metric] = Math.round((unweightedSum / count) * 10) / 10;
      }
    }
  }

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

/**
 * Computes horizontal row totals across all pivot values for each metric in the tree.
 * Populates `${metric}___ROW_TOTAL` on each node (leaves, parents, and Grand Total).
 */
export function computeHorizontalRowTotals(
  nodes: TreeNode[],
  metrics: string[],
  pivotValues: string[],
): void {
  if (!nodes || nodes.length === 0 || !metrics || metrics.length === 0 || !pivotValues || pivotValues.length === 0) {
    return;
  }

  const rowTotalKeys: string[] = [];
  for (const m of metrics) {
    rowTotalKeys.push(`${m}___ROW_TOTAL`);
  }

  function traverse(nodeList: TreeNode[]) {
    for (const node of nodeList) {
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }

      if (!node.metrics) {
        node.metrics = {};
      }

      for (const m of metrics) {
        if (isDerivedMetric(m)) {
          continue;
        }

        let rowSum = 0;
        let hasValue = false;

        for (const pVal of pivotValues) {
          const compKey = `${m}___${pVal}`;
          const subtotalKey = `${m}___${pVal}___SUBTOTAL`;
          const rawVal =
            node.metrics[compKey] ??
            node.metrics[subtotalKey] ??
            (node.subtotals ? (node.subtotals[compKey] ?? node.subtotals[subtotalKey]) : null);

          if (typeof rawVal === 'number' && Number.isFinite(rawVal)) {
            rowSum += rawVal;
            hasValue = true;
          }
        }

        if (hasValue) {
          node.metrics[`${m}___ROW_TOTAL`] = rowSum;
          if (node.subtotals) {
            node.subtotals[`${m}___ROW_TOTAL`] = rowSum;
          }
        } else if (node.metrics[`${m}___ROW_TOTAL`] === undefined) {
          node.metrics[`${m}___ROW_TOTAL`] = null;
          if (node.subtotals) {
            node.subtotals[`${m}___ROW_TOTAL`] = null;
          }
        }
      }

      // Recompute derived metrics for ROW_TOTAL suffix
      recomputeDerivedMetrics(node.metrics, rowTotalKeys);
      if (node.subtotals) {
        recomputeDerivedMetrics(node.subtotals, rowTotalKeys);
      }
    }
  }

  traverse(nodes);
}

