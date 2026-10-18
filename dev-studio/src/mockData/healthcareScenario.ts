export const healthcareScenario = {
  id: 'healthcare',
  name: 'Sanità Ospedaliera (ASL / Presidi / Privacy & Delta)',
  description: '4 livelli gerarchici con metriche di ricoveri, tempi di attesa (gg), delta % e casi <5 per test privacy/suppressione.',
  formData: {
    groupby: ['asl', 'distretto', 'presidio', 'disciplina'],
    tree_dimensions: ['asl', 'distretto', 'presidio', 'disciplina'],
    metrics: ['ricoveri', 'ricoveri_conf', 'delta_ricoveri_pct', 'tempo_attesa_gg', 'casi_rari'],
    columns: [],
    pivot_columns: [],
    initialExpandDepth: 2,
    expand_level: 2,
    showSubtotals: true,
    subtotals_enabled: true,
    showGrandTotal: true,
    grand_total_enabled: true,
    enableContextMenu: true,
    enable_context_menu: true,
    minMaxDisplayMode: 'diverging_heatmap',
    min_max_display_mode: 'diverging_heatmap',
    heatmapPalette: 'red_white_green',
    heatmap_palette: 'red_white_green',
    divergingMidpoint: 0,
    diverging_midpoint: 0,
    suppressionThreshold: 5,
    suppression_threshold: 5,
    suppressionMetrics: ['casi_rari'],
    suppression_metrics: ['casi_rari'],
    suppressionLabel: '<5',
    suppression_label: '<5',
    virtualization_enabled: true,
    page_size: 100,
    metric_definitions: JSON.stringify([
      { metric: 'ricoveri', type: 'sum', format: 'integer' },
      { metric: 'ricoveri_conf', type: 'sum', format: 'integer' },
      { metric: 'delta_ricoveri_pct', type: 'delta_pct', current: 'ricoveri', baseline: 'ricoveri_conf', format: 'percent', polarity: 'higher_is_better' },
      { metric: 'tempo_attesa_gg', type: 'mean', weight: 'ricoveri', format: 'decimal', decimals: 1, polarity: 'lower_is_better' },
      { metric: 'casi_rari', type: 'sum', format: 'integer' }
    ], null, 2),
    table_calculations: '',
    dimension_limits: '',
  },
  data: [
    // 2026-01 (Mese 1)
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale San Camillo', disciplina: 'Cardiologia', mese: '2026-01', ricoveri: 320, ricoveri_conf: 290, delta_ricoveri_pct: 10.3, tempo_attesa_gg: 4.2, casi_rari: 12 },
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale San Camillo', disciplina: 'Chirurgia Generale', mese: '2026-01', ricoveri: 450, ricoveri_conf: 460, delta_ricoveri_pct: -2.1, tempo_attesa_gg: 8.5, casi_rari: 3 }, // <5 per test soppressione
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale San Camillo', disciplina: 'Ortopedia', mese: '2026-01', ricoveri: 210, ricoveri_conf: 195, delta_ricoveri_pct: 7.7, tempo_attesa_gg: 6.1, casi_rari: 7 },
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale Nuovo', disciplina: 'Neurologia', mese: '2026-01', ricoveri: 180, ricoveri_conf: 175, delta_ricoveri_pct: 2.8, tempo_attesa_gg: 5.4, casi_rari: 2 }, // <5 per test soppressione
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale Nuovo', disciplina: 'Pediatria', mese: '2026-01', ricoveri: 140, ricoveri_conf: 155, delta_ricoveri_pct: -9.6, tempo_attesa_gg: 2.1, casi_rari: 1 }, // <5 per test soppressione
    { asl: 'ASL 1 Centro', distretto: 'Distretto B', presidio: 'Presidio Ovest', disciplina: 'Oncologia', mese: '2026-01', ricoveri: 290, ricoveri_conf: 260, delta_ricoveri_pct: 11.5, tempo_attesa_gg: 3.8, casi_rari: 18 },
    { asl: 'ASL 1 Centro', distretto: 'Distretto B', presidio: 'Presidio Ovest', disciplina: 'Dermatologia', mese: '2026-01', ricoveri: 95, ricoveri_conf: 110, delta_ricoveri_pct: -13.6, tempo_attesa_gg: 12.0, casi_rari: 4 }, // <5 per test soppressione
    
    { asl: 'ASL 2 Nord', distretto: 'Distretto Montano', presidio: 'Ospedale delle Valli', disciplina: 'Pronto Soccorso', mese: '2026-01', ricoveri: 820, ricoveri_conf: 800, delta_ricoveri_pct: 2.5, tempo_attesa_gg: 1.2, casi_rari: 45 },
    { asl: 'ASL 2 Nord', distretto: 'Distretto Montano', presidio: 'Ospedale delle Valli', disciplina: 'Medicina Interna', mese: '2026-01', ricoveri: 510, ricoveri_conf: 530, delta_ricoveri_pct: -3.7, tempo_attesa_gg: 7.4, casi_rari: 9 },
    { asl: 'ASL 2 Nord', distretto: 'Distretto Montano', presidio: 'Poliambulatorio Alpino', disciplina: 'Oculistica', mese: '2026-01', ricoveri: 125, ricoveri_conf: 115, delta_ricoveri_pct: 8.7, tempo_attesa_gg: 15.2, casi_rari: 0 },
    { asl: 'ASL 2 Nord', distretto: 'Distretto Laghi', presidio: 'Ospedale Civile', disciplina: 'Urologia', mese: '2026-01', ricoveri: 230, ricoveri_conf: 210, delta_ricoveri_pct: 9.5, tempo_attesa_gg: 9.1, casi_rari: 3 }, // <5
    { asl: 'ASL 2 Nord', distretto: 'Distretto Laghi', presidio: 'Ospedale Civile', disciplina: 'Ginecologia', mese: '2026-01', ricoveri: 310, ricoveri_conf: 305, delta_ricoveri_pct: 1.6, tempo_attesa_gg: 4.8, casi_rari: 14 },

    // 2026-02 (Mese 2 per test confronto temporale MoM)
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale San Camillo', disciplina: 'Cardiologia', mese: '2026-02', ricoveri: 350, ricoveri_conf: 300, delta_ricoveri_pct: 16.7, tempo_attesa_gg: 3.9, casi_rari: 15 },
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale San Camillo', disciplina: 'Chirurgia Generale', mese: '2026-02', ricoveri: 480, ricoveri_conf: 470, delta_ricoveri_pct: 2.1, tempo_attesa_gg: 7.8, casi_rari: 2 },
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale San Camillo', disciplina: 'Ortopedia', mese: '2026-02', ricoveri: 230, ricoveri_conf: 200, delta_ricoveri_pct: 15.0, tempo_attesa_gg: 5.8, casi_rari: 8 },
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale Nuovo', disciplina: 'Neurologia', mese: '2026-02', ricoveri: 195, ricoveri_conf: 180, delta_ricoveri_pct: 8.3, tempo_attesa_gg: 5.1, casi_rari: 1 },
    { asl: 'ASL 1 Centro', distretto: 'Distretto A', presidio: 'Ospedale Nuovo', disciplina: 'Pediatria', mese: '2026-02', ricoveri: 155, ricoveri_conf: 150, delta_ricoveri_pct: 3.3, tempo_attesa_gg: 2.0, casi_rari: 0 },
    { asl: 'ASL 1 Centro', distretto: 'Distretto B', presidio: 'Presidio Ovest', disciplina: 'Oncologia', mese: '2026-02', ricoveri: 310, ricoveri_conf: 270, delta_ricoveri_pct: 14.8, tempo_attesa_gg: 3.5, casi_rari: 21 },
    { asl: 'ASL 1 Centro', distretto: 'Distretto B', presidio: 'Presidio Ovest', disciplina: 'Dermatologia', mese: '2026-02', ricoveri: 105, ricoveri_conf: 115, delta_ricoveri_pct: -8.7, tempo_attesa_gg: 11.2, casi_rari: 3 },
    
    { asl: 'ASL 2 Nord', distretto: 'Distretto Montano', presidio: 'Ospedale delle Valli', disciplina: 'Pronto Soccorso', mese: '2026-02', ricoveri: 860, ricoveri_conf: 810, delta_ricoveri_pct: 6.2, tempo_attesa_gg: 1.1, casi_rari: 52 },
    { asl: 'ASL 2 Nord', distretto: 'Distretto Montano', presidio: 'Ospedale delle Valli', disciplina: 'Medicina Interna', mese: '2026-02', ricoveri: 540, ricoveri_conf: 520, delta_ricoveri_pct: 3.8, tempo_attesa_gg: 6.9, casi_rari: 11 },
    { asl: 'ASL 2 Nord', distretto: 'Distretto Montano', presidio: 'Poliambulatorio Alpino', disciplina: 'Oculistica', mese: '2026-02', ricoveri: 140, ricoveri_conf: 120, delta_ricoveri_pct: 16.7, tempo_attesa_gg: 14.0, casi_rari: 1 },
    { asl: 'ASL 2 Nord', distretto: 'Distretto Laghi', presidio: 'Ospedale Civile', disciplina: 'Urologia', mese: '2026-02', ricoveri: 245, ricoveri_conf: 215, delta_ricoveri_pct: 14.0, tempo_attesa_gg: 8.6, casi_rari: 4 },
    { asl: 'ASL 2 Nord', distretto: 'Distretto Laghi', presidio: 'Ospedale Civile', disciplina: 'Ginecologia', mese: '2026-02', ricoveri: 325, ricoveri_conf: 310, delta_ricoveri_pct: 4.8, tempo_attesa_gg: 4.5, casi_rari: 16 }
  ]
};
