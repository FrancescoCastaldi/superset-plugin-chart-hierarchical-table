import {
  recomputeDerivedMetrics,
  rollupTreeMetrics,
  computeGrandTotal,
} from '../src/utils/aggregations';
import { TreeNode } from '../src/types';

type Metrics = Record<string, number | string | null>;

function recompute(metrics: Metrics, keys: string[] = Object.keys(metrics)): Metrics {
  recomputeDerivedMetrics(metrics, keys);
  return metrics;
}

function leaf(key: string, depth: number, metrics: Metrics): TreeNode {
  return {
    key,
    id: key,
    name: key.split(' > ').pop() as string,
    depth,
    path: key.split(' > '),
    isLeaf: true,
    metrics,
  };
}

function parent(key: string, depth: number, children: TreeNode[]): TreeNode {
  return {
    key,
    id: key,
    name: key.split(' > ').pop() as string,
    depth,
    path: key.split(' > '),
    isLeaf: false,
    metrics: {},
    children,
  };
}

describe('aggregations.recomputeDerivedMetrics (AGENTS.md §5.3 naming conventions)', () => {
  describe('delta_richieste_pct -> richieste_corr / richieste_conf', () => {
    it('computes ((corr - conf) * 100) / conf rounded to one decimal', () => {
      const m = recompute({ richieste_corr: 120, richieste_conf: 100, delta_richieste_pct: null });
      expect(m.delta_richieste_pct).toBe(20);

      expect(recompute({ richieste_corr: 103, richieste_conf: 97, delta_richieste_pct: null }).delta_richieste_pct).toBe(6.2);
      expect(recompute({ richieste_corr: 80, richieste_conf: 100, delta_richieste_pct: null }).delta_richieste_pct).toBe(-20);
    });

    it('overrides a pre-existing SQL value with the value derived from the operands', () => {
      const m = recompute({ richieste_corr: 150, richieste_conf: 100, delta_richieste_pct: 999 });
      expect(m.delta_richieste_pct).toBe(50);
    });

    it('falls back to the conventional operand names when they are not listed in the metric keys', () => {
      const m: Metrics = { richieste_corr: 50, richieste_conf: 40 };
      recomputeDerivedMetrics(m, ['delta_richieste_pct']);
      expect(m.delta_richieste_pct).toBe(25);
    });

    it('returns Nuovo when the comparison is 0 and the current value is positive', () => {
      expect(recompute({ richieste_corr: 7, richieste_conf: 0, delta_richieste_pct: null }).delta_richieste_pct).toBe('Nuovo');
    });

    it('returns 0 when both current and comparison are 0', () => {
      expect(recompute({ richieste_corr: 0, richieste_conf: 0, delta_richieste_pct: null }).delta_richieste_pct).toBe(0);
    });

    it('returns null when the comparison is negative', () => {
      expect(recompute({ richieste_corr: 10, richieste_conf: -5, delta_richieste_pct: 3 }).delta_richieste_pct).toBeNull();
    });

    it('sets null when an operand is missing and no value exists, keeps an existing value otherwise', () => {
      const missing: Metrics = { richieste_corr: 10 };
      recomputeDerivedMetrics(missing, ['richieste_corr', 'delta_richieste_pct']);
      expect(missing.delta_richieste_pct).toBeNull();

      const existing: Metrics = { richieste_corr: 10, delta_richieste_pct: 12.5 };
      recomputeDerivedMetrics(existing, ['richieste_corr', 'delta_richieste_pct']);
      expect(existing.delta_richieste_pct).toBe(12.5);
    });

    it('pairs operands carrying the same pivot suffix', () => {
      const m = recompute({
        richieste_corr___SSN: 200,
        richieste_conf___SSN: 100,
        richieste_corr___PRIV: 10,
        richieste_conf___PRIV: 20,
        delta_richieste_pct___SSN: null,
        delta_richieste_pct___PRIV: null,
      });
      expect(m.delta_richieste_pct___SSN).toBe(100);
      expect(m.delta_richieste_pct___PRIV).toBe(-50);
    });
  });

  describe('delta_accesso_diretto_pct -> accesso_diretto / accesso_diretto_conf', () => {
    it('uses accesso_diretto as the current operand (no _corr suffix)', () => {
      const m = recompute({ accesso_diretto: 30, accesso_diretto_conf: 20, delta_accesso_diretto_pct: null });
      expect(m.delta_accesso_diretto_pct).toBe(50);
    });

    it('produces a percentage and not the acceptance p.p. delta despite containing "acc"', () => {
      const m = recompute({
        acc_corr: 90,
        acc_conf: 80,
        accesso_diretto: 12,
        accesso_diretto_conf: 0,
        delta_accesso_diretto_pct: null,
      });
      expect(m.delta_accesso_diretto_pct).toBe('Nuovo');
    });
  });

  describe('other conventional domains of the §5.3 table', () => {
    it('delta_programmata_pct -> programmata / programmata_conf', () => {
      const m = recompute({ programmata: 90, programmata_conf: 100, delta_programmata_pct: null });
      expect(m.delta_programmata_pct).toBe(-10);
    });

    it('delta_prime_visite_pct -> prime_visite / prime_visite_conf', () => {
      const m = recompute({ prime_visite: 15, prime_visite_conf: 0, delta_prime_visite_pct: null });
      expect(m.delta_prime_visite_pct).toBe('Nuovo');
    });

    it('delta_controlli_pct -> controlli / controlli_conf', () => {
      expect(recompute({ controlli: 0, controlli_conf: 0, delta_controlli_pct: null }).delta_controlli_pct).toBe(0);
      expect(recompute({ controlli: 45, controlli_conf: 40, delta_controlli_pct: null }).delta_controlli_pct).toBe(12.5);
    });
  });

  describe('generic pattern delta_X_pct -> X / X_conf (Branch 1e)', () => {
    it('derives operand names from the metric name', () => {
      expect(recompute({ ricoveri: 110, ricoveri_conf: 100, delta_ricoveri_pct: null }).delta_ricoveri_pct).toBe(10);
      expect(recompute({ esami_lab: 50, esami_lab_conf: 40, delta_esami_lab_pct: null }).delta_esami_lab_pct).toBe(25);
    });

    it('works for operands that are not listed in the metric keys', () => {
      const m: Metrics = { ricoveri: 3, ricoveri_conf: 0 };
      recomputeDerivedMetrics(m, ['delta_ricoveri_pct']);
      expect(m.delta_ricoveri_pct).toBe('Nuovo');
    });

    it('keeps the pivot suffix on the derived operand names', () => {
      const m = recompute({
        ricoveri___2024: 60,
        ricoveri_conf___2024: 40,
        delta_ricoveri_pct___2024: null,
      });
      expect(m.delta_ricoveri_pct___2024).toBe(50);
    });

    it('derives lower-cased operand names', () => {
      const m: Metrics = { Ricoveri: 10, Ricoveri_conf: 5 };
      recomputeDerivedMetrics(m, ['Ricoveri', 'Ricoveri_conf', 'delta_Ricoveri_pct']);
      expect(m.delta_Ricoveri_pct).toBeNull();

      const lower: Metrics = { ricoveri: 10, ricoveri_conf: 5 };
      recomputeDerivedMetrics(lower, ['delta_Ricoveri_pct']);
      expect(lower.delta_Ricoveri_pct).toBe(100);
    });
  });

  describe('saved dataset metrics vs adhoc SQL metrics with custom labels (AGENTS.md §5.2)', () => {
    it('saved metric_name keys produce Nuovo on the generic pattern', () => {
      const saved = recompute({ ricoveri: 10, ricoveri_conf: 0, delta_ricoveri_pct: null });
      expect(saved.delta_ricoveri_pct).toBe('Nuovo');
    });

    it('adhoc operand labels are not found by the generic pattern: the delta stays null', () => {
      const adhoc = recompute({
        'Ricoveri (Corrente)': 10,
        'Ricoveri (Confronto)': 0,
        delta_ricoveri_pct: null,
      });
      expect(adhoc.delta_ricoveri_pct).toBeNull();
    });

    it('adhoc delta labels without delta/variazione/diff keywords are never recomputed', () => {
      const adhoc: Metrics = {
        'Accesso Diretto (Corrente)': 12,
        'Accesso Diretto (Confronto)': 0,
        'Δ% Accesso Diretto': 7.5,
      };
      recompute(adhoc);
      expect(adhoc['Δ% Accesso Diretto']).toBe(7.5);

      const empty: Metrics = {
        'Accesso Diretto (Corrente)': 12,
        'Accesso Diretto (Confronto)': 0,
      };
      recomputeDerivedMetrics(empty, [...Object.keys(empty), 'Δ% Accesso Diretto']);
      expect(empty['Δ% Accesso Diretto']).toBeUndefined();
    });

    it('domain branches still match adhoc operand labels containing the domain keyword and corrente/confronto', () => {
      const m = recompute({
        'Accesso Diretto (Corrente)': 30,
        'Accesso Diretto (Confronto)': 20,
        delta_accesso_diretto_pct: null,
      });
      expect(m.delta_accesso_diretto_pct).toBe(50);
    });

    it('adhoc labels without the corrente/confronto markers fall back to missing conventional keys', () => {
      const m = recompute({
        'Accesso Diretto': 30,
        'Accesso Diretto Anno Prec.': 20,
        delta_accesso_diretto_pct: null,
      });
      expect(m.delta_accesso_diretto_pct).toBeNull();
    });
  });

  describe('non-percentage derived metrics', () => {
    it('prime_visite_pct is the share of prime visite on richieste_corr', () => {
      expect(recompute({ prime_visite: 30, richieste_corr: 120, prime_visite_pct: null }).prime_visite_pct).toBe(25);
    });

    it('prime_visite_pct falls back to prime_visite + controlli as denominator', () => {
      const m: Metrics = { prime_visite: 30, controlli: 70 };
      recomputeDerivedMetrics(m, ['prime_visite', 'controlli', 'prime_visite_pct']);
      expect(m.prime_visite_pct).toBe(30);

      const none: Metrics = {};
      recomputeDerivedMetrics(none, ['prime_visite_pct']);
      expect(none.prime_visite_pct).toBeNull();
    });

    it('delta_acc is the acceptance difference in percentage points', () => {
      expect(recompute({ acc_corr: 85.5, acc_conf: 80, delta_acc: null }).delta_acc).toBe(5.5);
    });

    it('delta_lt_off is the lead time difference in days', () => {
      expect(recompute({ lt_off_corr: 12.4, lt_off_conf: 10, delta_lt_off: null }).delta_lt_off).toBe(2.4);
    });

    it('generic variazione % pairs any *_corr / *_conf operands', () => {
      const m = recompute({ fatturato_corr: 200, fatturato_conf: 160, 'variazione % fatturato': null });
      expect(m['variazione % fatturato']).toBe(25);
    });

    it('generic variazione % leaves the value untouched when no operand pair exists', () => {
      const m = recompute({ fatturato: 200, 'variazione % fatturato': 4.2 });
      expect(m['variazione % fatturato']).toBe(4.2);
    });
  });
});

describe('aggregations.rollupTreeMetrics (multi-level subtotals)', () => {
  const metricNames = [
    'richieste_corr',
    'richieste_conf',
    'delta_richieste_pct',
    'accesso_diretto',
    'accesso_diretto_conf',
    'delta_accesso_diretto_pct',
  ];

  function buildTree(): TreeNode[] {
    return [
      parent('Lazio', 0, [
        parent('Lazio > Roma', 1, [
          leaf('Lazio > Roma > ASL1', 2, {
            richieste_corr: 100,
            richieste_conf: 80,
            delta_richieste_pct: 999,
            accesso_diretto: 10,
            accesso_diretto_conf: 0,
            delta_accesso_diretto_pct: null,
          }),
          leaf('Lazio > Roma > ASL2', 2, {
            richieste_corr: 50,
            richieste_conf: 70,
            delta_richieste_pct: null,
            accesso_diretto: 5,
            accesso_diretto_conf: 4,
            delta_accesso_diretto_pct: null,
          }),
        ]),
        leaf('Lazio > Viterbo', 1, {
          richieste_corr: 30,
          richieste_conf: 0,
          delta_richieste_pct: null,
          accesso_diretto: 0,
          accesso_diretto_conf: 0,
          delta_accesso_diretto_pct: null,
        }),
      ]),
    ];
  }

  it('sums additive metrics level by level', () => {
    const tree = buildTree();
    rollupTreeMetrics(tree, metricNames);
    const lazio = tree[0];
    const roma = lazio.children![0];

    expect(roma.metrics.richieste_corr).toBe(150);
    expect(roma.metrics.richieste_conf).toBe(150);
    expect(roma.metrics.accesso_diretto).toBe(15);
    expect(roma.metrics.accesso_diretto_conf).toBe(4);

    expect(lazio.metrics.richieste_corr).toBe(180);
    expect(lazio.metrics.richieste_conf).toBe(150);
    expect(lazio.metrics.accesso_diretto).toBe(15);
    expect(lazio.metrics.accesso_diretto_conf).toBe(4);
  });

  it('recomputes delta metrics on parents from aggregated operands instead of summing them', () => {
    const tree = buildTree();
    rollupTreeMetrics(tree, metricNames);
    const lazio = tree[0];
    const roma = lazio.children![0];

    expect(roma.metrics.delta_richieste_pct).toBe(0);
    expect(roma.metrics.delta_accesso_diretto_pct).toBe(275);
    expect(lazio.metrics.delta_richieste_pct).toBe(20);
    expect(lazio.metrics.delta_accesso_diretto_pct).toBe(275);
  });

  it('recomputes delta metrics on leaves (overriding SQL values, producing Nuovo / 0)', () => {
    const tree = buildTree();
    rollupTreeMetrics(tree, metricNames);
    const [asl1, asl2] = tree[0].children![0].children!;
    const viterbo = tree[0].children![1];

    expect(asl1.metrics.delta_richieste_pct).toBe(25);
    expect(asl1.metrics.delta_accesso_diretto_pct).toBe('Nuovo');
    expect(asl2.metrics.delta_richieste_pct).toBe(-28.6);
    expect(asl2.metrics.delta_accesso_diretto_pct).toBe(25);
    expect(viterbo.metrics.delta_richieste_pct).toBe('Nuovo');
    expect(viterbo.metrics.delta_accesso_diretto_pct).toBe(0);
  });

  it('mirrors aggregated and derived values in parent subtotals', () => {
    const tree = buildTree();
    rollupTreeMetrics(tree, metricNames);
    const roma = tree[0].children![0];

    expect(roma.subtotals).toEqual({
      richieste_corr: 150,
      richieste_conf: 150,
      accesso_diretto: 15,
      accesso_diretto_conf: 4,
      delta_richieste_pct: 0,
      delta_accesso_diretto_pct: 275,
    });
  });

  it('produces Nuovo on a parent whose aggregated comparison is 0 (saved metric names)', () => {
    const tree = [
      parent('A', 0, [
        leaf('A > x', 1, { ricoveri: 10, ricoveri_conf: 0, delta_ricoveri_pct: null }),
        leaf('A > y', 1, { ricoveri: 5, ricoveri_conf: 0, delta_ricoveri_pct: null }),
      ]),
    ];
    rollupTreeMetrics(tree, ['ricoveri', 'ricoveri_conf', 'delta_ricoveri_pct']);
    expect(tree[0].metrics.ricoveri).toBe(15);
    expect(tree[0].metrics.delta_ricoveri_pct).toBe('Nuovo');
  });

  it('cannot produce Nuovo on a parent when operands are adhoc labels', () => {
    const keys = ['Ricoveri (Corrente)', 'Ricoveri (Confronto)', 'delta_ricoveri_pct'];
    const tree = [
      parent('A', 0, [
        leaf('A > x', 1, { 'Ricoveri (Corrente)': 10, 'Ricoveri (Confronto)': 0, delta_ricoveri_pct: null }),
        leaf('A > y', 1, { 'Ricoveri (Corrente)': 5, 'Ricoveri (Confronto)': 0, delta_ricoveri_pct: null }),
      ]),
    ];
    rollupTreeMetrics(tree, keys);
    expect(tree[0].metrics['Ricoveri (Corrente)']).toBe(15);
    expect(tree[0].metrics.delta_ricoveri_pct).toBeNull();
  });

  it('uses a richieste-weighted average for rate metrics', () => {
    const tree = [
      parent('A', 0, [
        leaf('A > x', 1, { richieste_corr: 100, acc_corr: 80 }),
        leaf('A > y', 1, { richieste_corr: 300, acc_corr: 60 }),
      ]),
    ];
    rollupTreeMetrics(tree, ['richieste_corr', 'acc_corr']);
    expect(tree[0].metrics.richieste_corr).toBe(400);
    expect(tree[0].metrics.acc_corr).toBe(65);
  });

  it('uses a simple average for rate metrics when no weight is available', () => {
    const tree = [
      parent('A', 0, [leaf('A > x', 1, { acc_corr: 80 }), leaf('A > y', 1, { acc_corr: 61 })]),
    ];
    rollupTreeMetrics(tree, ['acc_corr']);
    expect(tree[0].metrics.acc_corr).toBe(70.5);
  });

  it('falls back to a weighted average of children for derived metrics without operands', () => {
    const tree = [
      parent('A', 0, [
        leaf('A > x', 1, { richieste_corr: 100, tasso_occupazione: 50 }),
        leaf('A > y', 1, { richieste_corr: 300, tasso_occupazione: 90 }),
      ]),
    ];
    rollupTreeMetrics(tree, ['richieste_corr', 'tasso_occupazione']);
    expect(tree[0].metrics.tasso_occupazione).toBe(80);
    expect(tree[0].subtotals?.tasso_occupazione).toBe(80);
  });

  it('honours the aggregation function and ignores non-numeric child values', () => {
    const tree = [
      parent('A', 0, [
        leaf('A > x', 1, { sales: 10 }),
        leaf('A > y', 1, { sales: 40 }),
        leaf('A > z', 1, { sales: null }),
      ]),
    ];
    rollupTreeMetrics(tree, ['sales'], 'max');
    expect(tree[0].metrics.sales).toBe(40);

    const empty = [parent('B', 0, [leaf('B > x', 1, { sales: null })])];
    rollupTreeMetrics(empty, ['sales']);
    expect(empty[0].metrics.sales).toBeNull();
  });
});

describe('aggregations.computeGrandTotal', () => {
  const metricNames = [
    'richieste_corr',
    'richieste_conf',
    'delta_richieste_pct',
    'accesso_diretto',
    'accesso_diretto_conf',
    'delta_accesso_diretto_pct',
  ];

  const roots = (): TreeNode[] => [
    leaf('Lazio', 0, {
      richieste_corr: 180,
      richieste_conf: 150,
      delta_richieste_pct: 20,
      accesso_diretto: 15,
      accesso_diretto_conf: 4,
      delta_accesso_diretto_pct: 275,
    }),
    leaf('Toscana', 0, {
      richieste_corr: 20,
      richieste_conf: 50,
      delta_richieste_pct: -60,
      accesso_diretto: 5,
      accesso_diretto_conf: 6,
      delta_accesso_diretto_pct: -16.7,
    }),
  ];

  it('returns the canonical grand total node shape with shared metrics/subtotals', () => {
    const gt = computeGrandTotal(roots(), metricNames);
    expect(gt.key).toBe('__grand_total__');
    expect(gt.id).toBe('__grand_total__');
    expect(gt.name).toBe('Grand Total');
    expect(gt.depth).toBe(0);
    expect(gt.path).toEqual(['Grand Total']);
    expect(gt.isLeaf).toBe(true);
    expect(gt.subtotals).toBe(gt.metrics);
  });

  it('sums the roots and recomputes the deltas from the totals', () => {
    const gt = computeGrandTotal(roots(), metricNames);
    expect(gt.metrics).toEqual({
      richieste_corr: 200,
      richieste_conf: 200,
      delta_richieste_pct: 0,
      accesso_diretto: 20,
      accesso_diretto_conf: 10,
      delta_accesso_diretto_pct: 100,
    });
  });

  it('produces Nuovo when the total comparison is 0', () => {
    const gt = computeGrandTotal(
      [
        leaf('a', 0, { ricoveri: 4, ricoveri_conf: 0 }),
        leaf('b', 0, { ricoveri: 1, ricoveri_conf: 0 }),
      ],
      ['ricoveri', 'ricoveri_conf', 'delta_ricoveri_pct'],
    );
    expect(gt.metrics.ricoveri).toBe(5);
    expect(gt.metrics.delta_ricoveri_pct).toBe('Nuovo');
  });

  it('computes pivoted keys independently per suffix', () => {
    const gt = computeGrandTotal(
      [
        leaf('a', 0, { richieste_corr___2024: 30, richieste_conf___2024: 20, richieste_corr___2025: 5, richieste_conf___2025: 0 }),
        leaf('b', 0, { richieste_corr___2024: 30, richieste_conf___2024: 20, richieste_corr___2025: 5, richieste_conf___2025: 0 }),
      ],
      [
        'richieste_corr___2024',
        'richieste_conf___2024',
        'delta_richieste_pct___2024',
        'richieste_corr___2025',
        'richieste_conf___2025',
        'delta_richieste_pct___2025',
      ],
    );
    expect(gt.metrics['richieste_corr___2024']).toBe(60);
    expect(gt.metrics['delta_richieste_pct___2024']).toBe(50);
    expect(gt.metrics['delta_richieste_pct___2025']).toBe('Nuovo');
  });

  it('weights rate metrics by richieste_corr / richieste_conf', () => {
    const gt = computeGrandTotal(
      [
        leaf('a', 0, { richieste_corr: 100, richieste_conf: 300, acc_corr: 80, acc_conf: 50 }),
        leaf('b', 0, { richieste_corr: 300, richieste_conf: 100, acc_corr: 60, acc_conf: 90 }),
      ],
      ['richieste_corr', 'richieste_conf', 'acc_corr', 'acc_conf'],
    );
    expect(gt.metrics.acc_corr).toBe(65);
    expect(gt.metrics.acc_conf).toBe(60);
  });

  it('uses a simple average for rate metrics without weights and null when no values exist', () => {
    const gt = computeGrandTotal(
      [leaf('a', 0, { acc_corr: 80, lt_off_corr: null }), leaf('b', 0, { acc_corr: 61, lt_off_corr: null })],
      ['acc_corr', 'lt_off_corr'],
    );
    expect(gt.metrics.acc_corr).toBe(70.5);
    expect(gt.metrics.lt_off_corr).toBeNull();
  });

  it('falls back to a weighted average of roots for derived metrics without operands', () => {
    const gt = computeGrandTotal(
      [
        leaf('a', 0, { richieste_corr: 100, tasso_occupazione: 50 }),
        leaf('b', 0, { richieste_corr: 300, tasso_occupazione: 90 }),
      ],
      ['richieste_corr', 'tasso_occupazione'],
    );
    expect(gt.metrics.tasso_occupazione).toBe(80);
  });

  it('returns null totals for an empty root list', () => {
    const gt = computeGrandTotal([], ['sales']);
    expect(gt.metrics.sales).toBeNull();
  });

  it('agrees with rollupTreeMetrics on a multi-level tree', () => {
    const tree = [
      parent('Lazio', 0, [
        leaf('Lazio > Roma', 1, { richieste_corr: 100, richieste_conf: 80, delta_richieste_pct: null }),
        leaf('Lazio > Rieti', 1, { richieste_corr: 20, richieste_conf: 40, delta_richieste_pct: null }),
      ]),
      parent('Umbria', 0, [
        leaf('Umbria > Terni', 1, { richieste_corr: 80, richieste_conf: 80, delta_richieste_pct: null }),
      ]),
    ];
    const keys = ['richieste_corr', 'richieste_conf', 'delta_richieste_pct'];
    rollupTreeMetrics(tree, keys);
    const gt = computeGrandTotal(tree, keys);
    expect(tree[0].metrics.delta_richieste_pct).toBe(0);
    expect(tree[1].metrics.delta_richieste_pct).toBe(0);
    expect(gt.metrics).toEqual({ richieste_corr: 200, richieste_conf: 200, delta_richieste_pct: 0 });
  });
});
