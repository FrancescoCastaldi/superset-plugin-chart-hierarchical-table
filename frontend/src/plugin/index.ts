import { t, ChartMetadata, ChartPlugin, Behavior } from '@superset-ui/core';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

const metadata = new ChartMetadata({
  name: t('Hierarchical Table & Matrix Grid'),
  description: t(
    'A tree-structured hierarchical table supporting multi-level dimension drill-down and parent-child adjacency hierarchies with interactive roll-up aggregations.',
  ),
  behaviors: [Behavior.INTERACTIVE_CHART, Behavior.DRILL_TO_DETAIL],
  category: t('Table'),
  tags: [
    t('Table'),
    t('Hierarchy'),
    t('Tree'),
    t('Drilldown'),
    t('Rollup'),
    t('Matrix'),
    t('Financial'),
  ],
  credits: ['Francesco Castaldi'],
  exampleGallery: [],
  thumbnail: '',
});

export default class HierarchicalTableChartPlugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('../components/HierarchicalTable'),
      metadata,
      transformProps,
    });
  }
}
