export function generateStressTestData(totalRows: number = 5000) {
  const areas = ['Area 1 - Nord Ovest', 'Area 2 - Nord Est', 'Area 3 - Centro', 'Area 4 - Sud', 'Area 5 - Isole'];
  const data: Array<Record<string, any>> = [];

  let count = 0;
  for (let a = 0; a < areas.length && count < totalRows; a++) {
    const area = areas[a];
    const hospitalCount = 10;
    for (let h = 1; h <= hospitalCount && count < totalRows; h++) {
      const hospital = `Presidio Ospedaliero ${String.fromCharCode(65 + a)}-${h.toString().padStart(2, '0')}`;
      const departmentCount = 20;
      for (let d = 1; d <= departmentCount && count < totalRows; d++) {
        const dept = `Reparto Clinico ${d.toString().padStart(2, '0')}`;
        const activityCount = 5;
        for (let act = 1; act <= activityCount && count < totalRows; act++) {
          const activity = `Attività Specifica #${act}`;
          const volume = Math.floor(50 + ((count * 31) % 450));
          const tempo = Number((1.5 + ((count * 17) % 180) / 10).toFixed(1));
          const costo = Math.round(volume * (120 + ((count * 13) % 200)));

          data.push({
            macro_area: area,
            ospedale: hospital,
            reparto: dept,
            prestazione: activity,
            volume_attivita: volume,
            tempo_medio_gg: tempo,
            costo_totale: costo,
          });
          count++;
        }
      }
    }
  }

  return data;
}

export const stressTestScenario = {
  id: 'stress_test_5k',
  name: 'Performance Stress-Test (5.000 Righe Gerarchiche Virtualizzate)',
  description: '5.000 righe su 4 livelli gerarchici per validare virtualizzazione a 60fps, memoria heap e reattività.',
  formData: {
    groupby: ['macro_area', 'ospedale', 'reparto', 'prestazione'],
    tree_dimensions: ['macro_area', 'ospedale', 'reparto', 'prestazione'],
    metrics: ['volume_attivita', 'tempo_medio_gg', 'costo_totale'],
    columns: [],
    pivot_columns: [],
    initialExpandDepth: 1,
    expand_level: 1,
    showSubtotals: true,
    subtotals_enabled: true,
    showGrandTotal: true,
    grand_total_enabled: true,
    enableContextMenu: true,
    enable_context_menu: true,
    minMaxDisplayMode: 'standard',
    min_max_display_mode: 'standard',
    theme_palette: 'corporate',
    virtualization_enabled: true,
    page_size: 100,
    metric_definitions: JSON.stringify([
      { metric: 'volume_attivita', type: 'sum', format: 'integer' },
      { metric: 'tempo_medio_gg', type: 'mean', weight: 'volume_attivita', format: 'decimal', decimals: 1 },
      { metric: 'costo_totale', type: 'sum', format: 'currency' }
    ], null, 2),
    table_calculations: '',
    dimension_limits: '',
  },
  get data() {
    return generateStressTestData(5000);
  }
};
