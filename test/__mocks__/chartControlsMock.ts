// Test-only stand-in for @superset-ui/chart-controls, which the host Superset provides at
// runtime but which is not installed in this repository (see src/types/chart-controls.d.ts).

export interface ControlPanelConfig {
  controlPanelSections: any[];
  [key: string]: any;
}

export const sharedControls: Record<string, Record<string, unknown>> = {
  groupby: { type: 'SelectControl', multi: true, label: 'Dimensions', default: [] },
  entity: { type: 'SelectControl', label: 'Entity', default: null },
  metrics: { type: 'MetricsControl', multi: true, label: 'Metrics', default: [] },
};

export const D3_FORMAT_OPTIONS: [string, string][] = [
  ['SMART_NUMBER', 'Adaptive formatting'],
  [',d', ',d'],
];
