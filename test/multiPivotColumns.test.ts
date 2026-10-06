jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) => (Array.isArray(val) ? val : [val]),
}));

import { buildMultiDimensionTree } from '../src/utils/treeBuilder';
import { computeHorizontalRowTotals, computeGrandTotal } from '../src/utils/aggregations';
import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps } from '../src/types';

describe('Two-Way Hierarchical Pivot Columns (2 Pivot Dimensions + Subtotals)', () => {
  // Dataset unpivoted reale conforme a Qlik Sense (Giorno x Fascia x Canale)
  const sampleRecords = [
    // Lunedì 00:00-01:00
    { giorno: 'Lun', fascia: '00:00-01:00', canale: 'Sportello', conteggio: 0 },
    { giorno: 'Lun', fascia: '00:00-01:00', canale: 'Preno. Sp...', conteggio: 0 },
    { giorno: 'Lun', fascia: '00:00-01:00', canale: 'PP', conteggio: 39 },
    // Lunedì 01:00-02:00
    { giorno: 'Lun', fascia: '01:00-02:00', canale: 'Sportello', conteggio: 5 },
    { giorno: 'Lun', fascia: '01:00-02:00', canale: 'Preno. Sp...', conteggio: 2 },
    { giorno: 'Lun', fascia: '01:00-02:00', canale: 'PP', conteggio: 12 },
    // Martedì 00:00-01:00
    { giorno: 'Mar', fascia: '00:00-01:00', canale: 'Sportello', conteggio: 8 },
    { giorno: 'Mar', fascia: '00:00-01:00', canale: 'Preno. Sp...', conteggio: 5 },
    { giorno: 'Mar', fascia: '00:00-01:00', canale: 'PP', conteggio: 40 },
    // Martedì 01:00-02:00
    { giorno: 'Mar', fascia: '01:00-02:00', canale: 'Sportello', conteggio: 10 },
    { giorno: 'Mar', fascia: '01:00-02:00', canale: 'Preno. Sp...', conteggio: 4 },
    { giorno: 'Mar', fascia: '01:00-02:00', canale: 'PP', conteggio: 12 },
  ];

  const dimensions = ['giorno'];
  const pivotDimensions = ['fascia', 'canale'];
  const metrics = ['conteggio'];

  describe('1. Data Tree Building with 2 Pivot Dimensions', () => {
    it('populates leaf cells, intermediate group subtotals and channel totals', () => {
      const tree = buildMultiDimensionTree(sampleRecords, dimensions, metrics, pivotDimensions);

      const lunNode = tree.find(n => n.name === 'Lun');
      expect(lunNode).toBeDefined();

      // Celle atomiche (d1 x d2)
      expect(lunNode?.metrics['conteggio___00:00-01:00___Sportello']).toBe(0);
      expect(lunNode?.metrics['conteggio___00:00-01:00___Preno. Sp...']).toBe(0);
      expect(lunNode?.metrics['conteggio___00:00-01:00___PP']).toBe(39);

      expect(lunNode?.metrics['conteggio___01:00-02:00___Sportello']).toBe(5);
      expect(lunNode?.metrics['conteggio___01:00-02:00___Preno. Sp...']).toBe(2);
      expect(lunNode?.metrics['conteggio___01:00-02:00___PP']).toBe(12);

      // Subtotale per fascia (00:00-01:00 e 01:00-02:00)
      expect(lunNode?.metrics['conteggio___00:00-01:00___SUBTOTAL']).toBe(39);
      expect(lunNode?.metrics['conteggio___01:00-02:00___SUBTOTAL']).toBe(5 + 2 + 12); // 19

      // Totale canale attraverso tutte le fasce per Lunedì
      expect(lunNode?.metrics['conteggio___ROW_TOTAL___Sportello']).toBe(0 + 5); // 5
      expect(lunNode?.metrics['conteggio___ROW_TOTAL___Preno. Sp...']).toBe(0 + 2); // 2
      expect(lunNode?.metrics['conteggio___ROW_TOTAL___PP']).toBe(39 + 12); // 51

      // Grand total riga Lunedì
      expect(lunNode?.metrics['conteggio___ROW_TOTAL']).toBe(39 + 19); // 58
    });
  });

  describe('2. Cross-Total Mathematical Balance with Grand Total', () => {
    it('ensures Grand Total node aggregates both dimensions with closed sum', () => {
      const tree = buildMultiDimensionTree(sampleRecords, dimensions, metrics, pivotDimensions);
      computeHorizontalRowTotals(tree, metrics, ['00:00-01:00', '01:00-02:00']);

      const grandTotalNode = computeGrandTotal(tree, [
        'conteggio___ROW_TOTAL',
        'conteggio___ROW_TOTAL___Sportello',
        'conteggio___ROW_TOTAL___Preno. Sp...',
        'conteggio___ROW_TOTAL___PP',
        'conteggio___00:00-01:00___SUBTOTAL',
        'conteggio___00:00-01:00___Sportello',
        'conteggio___00:00-01:00___Preno. Sp...',
        'conteggio___00:00-01:00___PP',
        'conteggio___01:00-02:00___SUBTOTAL',
        'conteggio___01:00-02:00___Sportello',
        'conteggio___01:00-02:00___Preno. Sp...',
        'conteggio___01:00-02:00___PP',
      ]);

      expect(grandTotalNode).toBeDefined();

      // Lun (58) + Mar (93: 8+5+40 + 10+4+12 = 53 + 26 = 79? No: 8+5+40=53, 10+4+12=26, 53+26=79) -> 58 + 79 = 137
      expect(grandTotalNode.metrics['conteggio___ROW_TOTAL']).toBe(58 + 79); // 137
      expect(grandTotalNode.metrics['conteggio___ROW_TOTAL___Sportello']).toBe(5 + 18); // 23
      expect(grandTotalNode.metrics['conteggio___ROW_TOTAL___Preno. Sp...']).toBe(2 + 9); // 11
      expect(grandTotalNode.metrics['conteggio___ROW_TOTAL___PP']).toBe(51 + 52); // 103

      // Quadratura somma canali = Totale generale: 23 + 11 + 103 = 137
      const sumChannels =
        (grandTotalNode.metrics['conteggio___ROW_TOTAL___Sportello'] as number) +
        (grandTotalNode.metrics['conteggio___ROW_TOTAL___Preno. Sp...'] as number) +
        (grandTotalNode.metrics['conteggio___ROW_TOTAL___PP'] as number);
      expect(sumChannels).toBe(grandTotalNode.metrics['conteggio___ROW_TOTAL']);
    });
  });

  describe('3. TransformProps Two-Level Header Generation', () => {
    it('creates hierarchical header groups and columns matching Qlik Sense layout', () => {
      const mockProps = {
        width: 1000,
        height: 600,
        formData: {
          hierarchyType: 'multi_dimension',
          groupby: ['giorno'],
          columns: ['fascia', 'canale'],
          metrics: ['conteggio'],
          combineMetric: true,
          pivotSortOrder: 'asc',
          pivotRowTotalsPosition: 'left',
          pivotRowTotalsLabel: 'Totals',
          showPivotColumnSubtotals: true,
          pivotColumnSubtotalLabel: 'Totale',
        },
        queriesData: [
          {
            data: sampleRecords,
          },
        ],
      } as unknown as HierarchicalTableChartProps;

      const result = transformProps(mockProps);

      expect(result.isPivotMode).toBe(true);
      expect(result.pivotHeaderGroups).toBeDefined();

      // Gruppi di primo livello: Totals + 2 Fasce Orarie = 3 gruppi
      expect(result.pivotHeaderGroups?.length).toBe(3);
      expect(result.pivotHeaderGroups?.[0].title).toBe('Totals');
      expect(result.pivotHeaderGroups?.[1].title).toBe('00:00-01:00');
      expect(result.pivotHeaderGroups?.[2].title).toBe('01:00-02:00');

      // Ogni gruppo di primo livello ha 4 sotto-colonne: Totale (subtotale) + 3 canali
      expect(result.pivotHeaderGroups?.[0].colSpan).toBe(4);
      expect(result.pivotHeaderGroups?.[1].colSpan).toBe(4);
      expect(result.pivotHeaderGroups?.[2].colSpan).toBe(4);

      // Verifica titoli delle colonne generate
      // Colonna 0: Gerarchia (giorno)
      expect(result.columns[0].dataIndex).toBe('name');

      // Colonne sotto Totals:
      expect(result.columns[1].title).toBe('Totale');
      expect(result.columns[1].key).toBe('conteggio___ROW_TOTAL');

      expect(result.columns[2].title).toBe('Sportello');
      expect(result.columns[2].key).toBe('conteggio___ROW_TOTAL___Sportello');

      expect(result.columns[3].title).toBe('Preno. Sp...');
      expect(result.columns[3].key).toBe('conteggio___ROW_TOTAL___Preno. Sp...');

      expect(result.columns[4].title).toBe('PP');
      expect(result.columns[4].key).toBe('conteggio___ROW_TOTAL___PP');

      // Colonne sotto 00:00-01:00:
      expect(result.columns[5].title).toBe('Totale');
      expect(result.columns[5].key).toBe('conteggio___00:00-01:00___SUBTOTAL');

      expect(result.columns[6].title).toBe('Sportello');
      expect(result.columns[6].key).toBe('conteggio___00:00-01:00___Sportello');

      expect(result.columns[7].title).toBe('Preno. Sp...');
      expect(result.columns[7].key).toBe('conteggio___00:00-01:00___Preno. Sp...');

      expect(result.columns[8].title).toBe('PP');
      expect(result.columns[8].key).toBe('conteggio___00:00-01:00___PP');
    });
  });
});
