jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) => (Array.isArray(val) ? val : [val]),
}));

import { buildMultiDimensionTree } from '../src/utils/treeBuilder';
import { computeHorizontalRowTotals, computeGrandTotal } from '../src/utils/aggregations';
import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps } from '../src/types';

describe('Two-Way Pivot Matrix Grid & Horizontal Row Totals', () => {
  const sampleRecords: DataRecord[] = [
    // Lunedì
    {
      giorno: 'Lun',
      fascia: '00:00-01:00',
      totale: 39,
      sportello: 0,
      preno_sp: 0,
      pp: 39,
    },
    {
      giorno: 'Lun',
      fascia: '01:00-02:00',
      totale: 19,
      sportello: 5,
      preno_sp: 2,
      pp: 12,
    },
    // Martedì
    {
      giorno: 'Mar',
      fascia: '00:00-01:00',
      totale: 53,
      sportello: 10,
      preno_sp: 3,
      pp: 40,
    },
    {
      giorno: 'Mar',
      fascia: '01:00-02:00',
      totale: 26,
      sportello: 8,
      preno_sp: 1,
      pp: 17,
    },
  ];

  const metrics = ['totale', 'sportello', 'preno_sp', 'pp'];
  const dimensions = ['giorno'];
  const pivotDimensions = ['fascia'];
  const pivotValues = ['00:00-01:00', '01:00-02:00'];

  describe('Mathematical Horizontal Row Total Calculation', () => {
    it('computes accurate horizontal sum across all pivot values for each row', () => {
      const tree = buildMultiDimensionTree(sampleRecords, dimensions, metrics, pivotDimensions);

      // Invoke mathematical engine for horizontal totals
      computeHorizontalRowTotals(tree, metrics, pivotValues);

      const lunNode = tree.find(n => n.name === 'Lun');
      expect(lunNode).toBeDefined();
      expect(lunNode?.metrics['totale___ROW_TOTAL']).toBe(39 + 19); // 58
      expect(lunNode?.metrics['sportello___ROW_TOTAL']).toBe(0 + 5); // 5
      expect(lunNode?.metrics['preno_sp___ROW_TOTAL']).toBe(0 + 2); // 2
      expect(lunNode?.metrics['pp___ROW_TOTAL']).toBe(39 + 12); // 51

      const marNode = tree.find(n => n.name === 'Mar');
      expect(marNode).toBeDefined();
      expect(marNode?.metrics['totale___ROW_TOTAL']).toBe(53 + 26); // 79
      expect(marNode?.metrics['sportello___ROW_TOTAL']).toBe(10 + 8); // 18
      expect(marNode?.metrics['preno_sp___ROW_TOTAL']).toBe(3 + 1); // 4
      expect(marNode?.metrics['pp___ROW_TOTAL']).toBe(40 + 17); // 57
    });

    it('ensures perfect two-way cross-total square balance on Grand Total node', () => {
      const tree = buildMultiDimensionTree(sampleRecords, dimensions, metrics, pivotDimensions);
      computeHorizontalRowTotals(tree, metrics, pivotValues);

      const allMetricKeys = [
        ...metrics.map(m => `${m}___00:00-01:00`),
        ...metrics.map(m => `${m}___01:00-02:00`),
        ...metrics.map(m => `${m}___ROW_TOTAL`),
      ];

      const grandTotal = computeGrandTotal(tree, allMetricKeys);

      // Incrocio: somma dei totali di riga == somma dei totali di colonna
      expect(grandTotal.metrics['totale___ROW_TOTAL']).toBe(58 + 79); // 137
      expect(grandTotal.metrics['sportello___ROW_TOTAL']).toBe(5 + 18); // 23
      expect(grandTotal.metrics['preno_sp___ROW_TOTAL']).toBe(2 + 4); // 6
      expect(grandTotal.metrics['pp___ROW_TOTAL']).toBe(51 + 57); // 108

      // Verifica consistenza con colonne orizzontali del Grand Total
      const sumSlot0 = (grandTotal.metrics['totale___00:00-01:00'] as number) || 0; // 39 + 53 = 92
      const sumSlot1 = (grandTotal.metrics['totale___01:00-02:00'] as number) || 0; // 19 + 26 = 45
      expect(sumSlot0 + sumSlot1).toBe(grandTotal.metrics['totale___ROW_TOTAL']); // 92 + 45 = 137
    });
  });

  describe('transformProps with pivotRowTotalsPosition', () => {
    const baseChartProps: any = {
      width: 1200,
      height: 600,
      formData: {
        hierarchyType: 'multi_dimension',
        groupby: ['giorno'],
        columns: ['fascia'],
        metrics,
        combineMetric: true,
        showGrandTotal: true,
      },
      queriesData: [{ data: sampleRecords }],
    };

    it('positions the Totals macro-header on the LEFT (Qlik Sense style)', () => {
      const props = transformProps({
        ...baseChartProps,
        formData: {
          ...baseChartProps.formData,
          pivotRowTotalsPosition: 'left',
          pivotRowTotalsLabel: 'Totals',
          pivotSortOrder: 'asc',
        },
      } as HierarchicalTableChartProps);

      expect(props.pivotHeaderGroups).toBeDefined();
      expect(props.pivotHeaderGroups?.length).toBe(3); // Totals, 00:00-01:00, 01:00-02:00

      // Il primo gruppo header a sinistra deve essere 'Totals'
      const firstGroup = props.pivotHeaderGroups?.[0];
      expect(firstGroup?.title).toBe('Totals');
      expect(firstGroup?.colSpan).toBe(4); // 4 metriche

      // Le prime 4 colonne metriche in columns devono corrispondere al totale di riga
      const metricCols = props.columns.filter(c => c.isMetric);
      expect(metricCols[0].key).toBe('totale___ROW_TOTAL');
      expect(metricCols[1].key).toBe('sportello___ROW_TOTAL');
      expect(metricCols[2].key).toBe('preno_sp___ROW_TOTAL');
      expect(metricCols[3].key).toBe('pp___ROW_TOTAL');

      // Subito dopo devono esserci le colonne di 00:00-01:00
      expect(metricCols[4].key).toBe('totale___00:00-01:00');
    });

    it('positions the Totals macro-header on the RIGHT (Excel / Classic style)', () => {
      const props = transformProps({
        ...baseChartProps,
        formData: {
          ...baseChartProps.formData,
          pivotRowTotalsPosition: 'right',
          pivotRowTotalsLabel: 'Totale Complessivo',
        },
      } as HierarchicalTableChartProps);

      expect(props.pivotHeaderGroups).toBeDefined();
      const lastGroup = props.pivotHeaderGroups?.[props.pivotHeaderGroups.length - 1];
      expect(lastGroup?.title).toBe('Totale Complessivo');
      expect(lastGroup?.colSpan).toBe(4);

      const metricCols = props.columns.filter(c => c.isMetric);
      const lastFourCols = metricCols.slice(-4);
      expect(lastFourCols[0].key).toBe('totale___ROW_TOTAL');
      expect(lastFourCols[1].key).toBe('sportello___ROW_TOTAL');
      expect(lastFourCols[2].key).toBe('preno_sp___ROW_TOTAL');
      expect(lastFourCols[3].key).toBe('pp___ROW_TOTAL');
    });

    it('defaults to none when pivotRowTotalsPosition is none or omitted', () => {
      const props = transformProps({
        ...baseChartProps,
        formData: {
          ...baseChartProps.formData,
          pivotRowTotalsPosition: 'none',
        },
      } as HierarchicalTableChartProps);

      expect(props.pivotHeaderGroups?.length).toBe(2); // Solo 00:00-01:00 e 01:00-02:00
      const hasRowTotal = props.columns.some(c => c.key.includes('___ROW_TOTAL'));
      expect(hasRowTotal).toBe(false);
    });
  });
});
