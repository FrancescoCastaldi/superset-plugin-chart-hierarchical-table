export const salesPivotScenario = {
  id: 'sales_pivot',
  name: 'Vendite Multi-Pivot & Table Calculations (% Totale, Rank, Bar)',
  description: 'Gerarchia Regione -> Settore -> Prodotto con pivot trimestrale (Q1, Q2, Q3, Q4) e Data Bars bipolari.',
  formData: {
    groupby: ['regione', 'settore', 'prodotto'],
    tree_dimensions: ['regione', 'settore', 'prodotto'],
    metrics: ['fatturato', 'margine_pct', 'ordini'],
    columns: ['trimestre'],
    pivot_columns: ['trimestre'],
    initialExpandDepth: 2,
    expand_level: 2,
    showSubtotals: true,
    subtotals_enabled: true,
    showGrandTotal: true,
    grand_total_enabled: true,
    enableContextMenu: true,
    enable_context_menu: true,
    minMaxDisplayMode: 'bipolar_data_bars',
    min_max_display_mode: 'bipolar_data_bars',
    heatmapPalette: 'blue_white_red',
    heatmap_palette: 'blue_white_red',
    divergingMidpoint: 0,
    diverging_midpoint: 0,
    suppressionThreshold: 0,
    suppression_threshold: 0,
    virtualization_enabled: true,
    page_size: 50,
    metric_definitions: JSON.stringify([
      { metric: 'fatturato', type: 'sum', format: 'currency' },
      { metric: 'margine_pct', type: 'mean', weight: 'fatturato', format: 'percent', decimals: 1, polarity: 'higher_is_better' },
      { metric: 'ordini', type: 'sum', format: 'integer' }
    ], null, 2),
    table_calculations: JSON.stringify([
      { calculation: 'pct_of_total', metric: 'fatturato', displayMode: 'companion', label: '% Fatt. Totale' },
      { calculation: 'rank', metric: 'fatturato', displayMode: 'companion', label: 'Ranking' }
    ], null, 2),
    dimension_limits: JSON.stringify({
      level_limits: [
        { level: 2, limit: 3, order: 'top', aggregationLabel: 'Altri Prodotti' }
      ]
    }, null, 2),
  },
  data: [
    // Nord Italia
    { regione: 'Nord Italia', settore: 'Tecnologia', prodotto: 'Cloud Suite Pro', trimestre: 'Q1', fatturato: 125000, margine_pct: 32.4, ordini: 42 },
    { regione: 'Nord Italia', settore: 'Tecnologia', prodotto: 'Cloud Suite Pro', trimestre: 'Q2', fatturato: 142000, margine_pct: 34.1, ordini: 48 },
    { regione: 'Nord Italia', settore: 'Tecnologia', prodotto: 'Cloud Suite Pro', trimestre: 'Q3', fatturato: 138000, margine_pct: 33.5, ordini: 45 },
    { regione: 'Nord Italia', settore: 'Tecnologia', prodotto: 'Cloud Suite Pro', trimestre: 'Q4', fatturato: 168000, margine_pct: 36.2, ordini: 55 },
    { regione: 'Nord Italia', settore: 'Tecnologia', prodotto: 'Cybersecurity Shield', trimestre: 'Q1', fatturato: 85000, margine_pct: 41.0, ordini: 28 },
    { regione: 'Nord Italia', settore: 'Tecnologia', prodotto: 'Cybersecurity Shield', trimestre: 'Q2', fatturato: 92000, margine_pct: 42.5, ordini: 31 },
    { regione: 'Nord Italia', settore: 'Tecnologia', prodotto: 'Cybersecurity Shield', trimestre: 'Q3', fatturato: 99000, margine_pct: 43.1, ordini: 33 },
    { regione: 'Nord Italia', settore: 'Tecnologia', prodotto: 'Cybersecurity Shield', trimestre: 'Q4', fatturato: 115000, margine_pct: 44.8, ordini: 38 },
    { regione: 'Nord Italia', settore: 'Healthcare Tech', prodotto: 'Cartella Clinica EMR', trimestre: 'Q1', fatturato: 210000, margine_pct: 28.5, ordini: 15 },
    { regione: 'Nord Italia', settore: 'Healthcare Tech', prodotto: 'Cartella Clinica EMR', trimestre: 'Q2', fatturato: 230000, margine_pct: 29.2, ordini: 17 },
    { regione: 'Nord Italia', settore: 'Healthcare Tech', prodotto: 'Cartella Clinica EMR', trimestre: 'Q3', fatturato: 225000, margine_pct: 28.9, ordini: 16 },
    { regione: 'Nord Italia', settore: 'Healthcare Tech', prodotto: 'Cartella Clinica EMR', trimestre: 'Q4', fatturato: 275000, margine_pct: 31.0, ordini: 20 },
    
    // Centro Italia
    { regione: 'Centro Italia', settore: 'Tecnologia', prodotto: 'Cloud Suite Pro', trimestre: 'Q1', fatturato: 95000, margine_pct: 29.8, ordini: 31 },
    { regione: 'Centro Italia', settore: 'Tecnologia', prodotto: 'Cloud Suite Pro', trimestre: 'Q2', fatturato: 105000, margine_pct: 31.2, ordini: 35 },
    { regione: 'Centro Italia', settore: 'Tecnologia', prodotto: 'Cloud Suite Pro', trimestre: 'Q3', fatturato: 101000, margine_pct: 30.5, ordini: 33 },
    { regione: 'Centro Italia', settore: 'Tecnologia', prodotto: 'Cloud Suite Pro', trimestre: 'Q4', fatturato: 122000, margine_pct: 33.0, ordini: 40 },
    { regione: 'Centro Italia', settore: 'Healthcare Tech', prodotto: 'Portale Sanitario Paziente', trimestre: 'Q1', fatturato: 140000, margine_pct: 35.0, ordini: 22 },
    { regione: 'Centro Italia', settore: 'Healthcare Tech', prodotto: 'Portale Sanitario Paziente', trimestre: 'Q2', fatturato: 155000, margine_pct: 36.2, ordini: 25 },
    { regione: 'Centro Italia', settore: 'Healthcare Tech', prodotto: 'Portale Sanitario Paziente', trimestre: 'Q3', fatturato: 148000, margine_pct: 35.8, ordini: 24 },
    { regione: 'Centro Italia', settore: 'Healthcare Tech', prodotto: 'Portale Sanitario Paziente', trimestre: 'Q4', fatturato: 180000, margine_pct: 38.5, ordini: 29 },
  ]
};
