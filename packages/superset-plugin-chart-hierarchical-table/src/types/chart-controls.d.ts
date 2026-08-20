declare module '@superset-ui/chart-controls' {
  export const sharedControls: Record<string, any>;
  export const D3_FORMAT_OPTIONS: [string, string][];
  export interface ControlPanelConfig {
    controlPanelSections: any[];
    [key: string]: any;
  }
}
