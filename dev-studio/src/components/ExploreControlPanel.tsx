import React, { useState } from 'react';
import { ControlAccordion } from './ControlAccordion';
import { MetricDefinitionsEditor } from './MetricDefinitionsEditor';
import { PeriodComparisonEditor } from './PeriodComparisonEditor';
import { reorderArray, reorderMetricsWithPosition } from '../../../src/utils/metricReorder';

interface ExploreControlPanelProps {
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
  availableDimensions: string[];
  availableMetrics: string[];
  records?: any[];
}

export const ExploreControlPanel: React.FC<ExploreControlPanelProps> = ({
  formData,
  onChange,
  availableDimensions,
  availableMetrics,
  records = [],
}) => {
  const [draggedChipIndex, setDraggedChipIndex] = useState<number | null>(null);
  const [dragOverChipIndex, setDragOverChipIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null);

  const activeMetrics: string[] = formData.metrics || [];
  const remainingMetrics = availableMetrics.filter((m) => !activeMetrics.includes(m));

  return (
    <div className="studio-sidebar">
      <div className="sidebar-header">
        <span>⚙️ Superset Explore Controls</span>
        <span className="studio-badge">StratumTree v0.8.4</span>
      </div>

      <div className="sidebar-content">
        {/* 1. Dimensions & Hierarchy */}
        <ControlAccordion title="Dimensions & Hierarchy" icon="🌳" defaultOpen={true}>
          <div className="control-group">
            <label className="control-label">Hierarchy Row Dimensions (groupby)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {availableDimensions.map((dim) => {
                const current = formData.groupby || formData.tree_dimensions || [];
                const isSelected = current.includes(dim);
                return (
                  <button
                    key={dim}
                    type="button"
                    className={`btn-pill ${isSelected ? 'primary' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      const next = isSelected ? current.filter((d: string) => d !== dim) : [...current, dim];
                      onChange('groupby', next);
                      onChange('tree_dimensions', next);
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {dim}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="control-group" style={{ marginTop: '8px' }}>
            <label className="control-label">Pivot Columns (Horizontal Matrix)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {availableDimensions.map((dim) => {
                const rowDims = formData.groupby || formData.tree_dimensions || [];
                const isRowDim = rowDims.includes(dim);
                const currentPivots = formData.columns || formData.pivot_columns || [];
                const isSelected = currentPivots.includes(dim);
                return (
                  <button
                    key={dim}
                    type="button"
                    disabled={isRowDim}
                    className={`btn-pill ${isSelected ? 'primary' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px', opacity: isRowDim ? 0.35 : 1 }}
                    title={isRowDim ? 'Già usata come dimensione riga' : undefined}
                    onClick={() => {
                      const next = isSelected ? currentPivots.filter((d: string) => d !== dim) : [...currentPivots, dim];
                      onChange('columns', next);
                      onChange('pivot_columns', next);
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {dim}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Initial Expand Level</label>
            <select
              className="control-select"
              value={formData.initialExpandDepth ?? formData.expand_level ?? 2}
              onChange={(e) => {
                const val = Number(e.target.value);
                onChange('initialExpandDepth', val);
                onChange('expand_level', val);
              }}
            >
              <option value={1}>Level 1 (Root only)</option>
              <option value={2}>Level 2 (First child)</option>
              <option value={3}>Level 3 (Sub-branches)</option>
              <option value={4}>Level 4 (Leaves)</option>
              <option value={-1}>All Levels (Fully Expanded)</option>
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Value Display Mode</label>
            <select
              className="control-select"
              value={formData.valueDisplayMode || formData.value_display_mode || 'all'}
              onChange={(e) => {
                onChange('valueDisplayMode', e.target.value);
                onChange('value_display_mode', e.target.value);
              }}
            >
              <option value="all">All Rows (Parents + Leaves)</option>
              <option value="leaves">Leaves Only (Detailed Flat Tree)</option>
              <option value="parents">Parents Only (Executive Summary)</option>
            </select>
          </div>

          <label className="control-toggle">
            <input
              type="checkbox"
              checked={formData.showSubtotals !== false && formData.subtotals_enabled !== false}
              onChange={(e) => {
                onChange('showSubtotals', e.target.checked);
                onChange('subtotals_enabled', e.target.checked);
              }}
            />
            <span>Show Hierarchy Subtotals</span>
          </label>

          <label className="control-toggle">
            <input
              type="checkbox"
              checked={formData.showGrandTotal !== false && formData.grand_total_enabled !== false}
              onChange={(e) => {
                onChange('showGrandTotal', e.target.checked);
                onChange('grand_total_enabled', e.target.checked);
              }}
            />
            <span>Show Grand Total Row</span>
          </label>

          <div className="control-group">
            <label className="control-label">Grand Total Position</label>
            <select
              className="control-select"
              value={formData.grandTotalPosition || formData.grand_total_position || 'top'}
              onChange={(e) => {
                onChange('grandTotalPosition', e.target.value);
                onChange('grand_total_position', e.target.value);
              }}
            >
              <option value="top">Top (Above Hierarchy)</option>
              <option value="bottom">Bottom of Grid</option>
            </select>
          </div>

          <label className="control-toggle">
            <input
              type="checkbox"
              checked={formData.enableSearch !== false && formData.enable_search !== false}
              onChange={(e) => {
                onChange('enableSearch', e.target.checked);
                onChange('enable_search', e.target.checked);
              }}
            />
            <span>Enable Interactive Search Bar</span>
          </label>
        </ControlAccordion>

        {/* 2. Metrics & Aggregations */}
        <ControlAccordion title="Metrics & Aggregations" icon="📊" defaultOpen={true}>
          <div className="control-group">
            <label className="control-label">Active Metrics (Drag or use arrows to reorder)</label>
            {activeMetrics.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                Nessuna metrica attiva. Aggiungine una dalle metriche disponibili sotto.
              </div>
            ) : (
              <div className="metric-chips-container">
                {activeMetrics.map((met, index) => {
                  const isDragging = draggedChipIndex === index;
                  const isTargetBefore = dragOverChipIndex === index && dragOverPosition === 'before';
                  const isTargetAfter = dragOverChipIndex === index && dragOverPosition === 'after';

                  const chipClasses = [
                    'metric-chip',
                    isDragging ? 'is-dragging' : '',
                    isTargetBefore ? 'drop-target-before' : '',
                    isTargetAfter ? 'drop-target-after' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <div
                      key={met}
                      draggable={true}
                      className={chipClasses}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', met);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedChipIndex(index);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        const rect = e.currentTarget.getBoundingClientRect();
                        const isBefore = e.clientX < rect.left + rect.width / 2;
                        setDragOverChipIndex(index);
                        setDragOverPosition(isBefore ? 'before' : 'after');
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) {
                          return;
                        }
                        if (dragOverChipIndex === index) {
                          setDragOverChipIndex(null);
                          setDragOverPosition(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceMetric =
                          e.dataTransfer.getData('text/plain') ||
                          (draggedChipIndex !== null ? activeMetrics[draggedChipIndex] : null);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const isBefore = e.clientX < rect.left + rect.width / 2;
                        const effectivePosition =
                          dragOverChipIndex === index && dragOverPosition
                            ? dragOverPosition
                            : isBefore
                            ? 'before'
                            : 'after';

                        if (sourceMetric && sourceMetric !== met && activeMetrics.includes(sourceMetric)) {
                          const reordered = reorderMetricsWithPosition(
                            activeMetrics,
                            sourceMetric,
                            met,
                            effectivePosition,
                          );
                          onChange('metrics', reordered);
                        }
                        setDraggedChipIndex(null);
                        setDragOverChipIndex(null);
                        setDragOverPosition(null);
                      }}
                      onDragEnd={() => {
                        setDraggedChipIndex(null);
                        setDragOverChipIndex(null);
                        setDragOverPosition(null);
                      }}
                    >
                      <span className="metric-chip-handle" title="Trascina per riordinare">
                        ⠿
                      </span>
                      <span className="metric-chip-badge">#{index + 1}</span>
                      <span className="metric-chip-name">{met}</span>
                      <div className="metric-chip-actions">
                        <button
                          type="button"
                          className="metric-chip-btn"
                          disabled={index === 0}
                          title="Sposta prima"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (index > 0) {
                              onChange('metrics', reorderArray(activeMetrics, index, index - 1));
                            }
                          }}
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          className="metric-chip-btn"
                          disabled={index === activeMetrics.length - 1}
                          title="Sposta dopo"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (index < activeMetrics.length - 1) {
                              onChange('metrics', reorderArray(activeMetrics, index, index + 1));
                            }
                          }}
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          className="metric-chip-btn btn-remove"
                          title="Rimuovi metrica"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChange('metrics', activeMetrics.filter((m) => m !== met));
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {remainingMetrics.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <label className="control-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  + Aggiungi Metrica Disponibile
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {remainingMetrics.map((met) => (
                    <button
                      key={met}
                      type="button"
                      className="btn-pill"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => {
                        onChange('metrics', [...activeMetrics, met]);
                      }}
                    >
                      + {met}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="control-group">
            <label className="control-label">Default Number Format</label>
            <select
              className="control-select"
              value={formData.number_format || 'SMART_NUMBER'}
              onChange={(e) => onChange('number_format', e.target.value)}
            >
              <option value="SMART_NUMBER">Smart Auto (Italian Locale)</option>
              <option value=",.0f">Integer (1.234)</option>
              <option value=",.1f">1 Decimal (1.234,5)</option>
              <option value=",.2f">2 Decimals (1.234,56)</option>
              <option value=".1%">Percentage (12.3%)</option>
              <option value="DURATION_COL">Duration (mm:ss)</option>
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Currency Symbol</label>
            <input
              type="text"
              className="control-input"
              value={formData.currency_symbol || ''}
              placeholder="e.g. € or $"
              onChange={(e) => onChange('currency_symbol', e.target.value)}
            />
          </div>

          <div className="control-group">
            <label className="control-label" style={{ marginBottom: '6px' }}>
              Metric Definitions & Rollup Semantics
            </label>
            <MetricDefinitionsEditor
              metrics={formData.metrics || []}
              availableMetrics={availableMetrics}
              availableDimensions={availableDimensions}
              value={formData.metric_definitions || formData.metricDefinitions || ''}
              onChange={(jsonStr) => {
                onChange('metric_definitions', jsonStr);
                onChange('metricDefinitions', jsonStr);
              }}
            />
          </div>
        </ControlAccordion>

        {/* 3. Comparison & Analysis (v0.5.0, v0.6.0) */}
        <ControlAccordion title="Comparison & Analysis" icon="⚡" badge="v0.6.0" defaultOpen={true}>
          <label className="control-toggle">
            <input
              type="checkbox"
              checked={formData.enable_context_menu !== false}
              onChange={(e) => onChange('enable_context_menu', e.target.checked)}
            />
            <span>Enable Superset Context Menu (Drill/Filter)</span>
          </label>

          <div className="control-group">
            <label className="control-label">Table Calculations (% Total, Running, Rank)</label>
            <textarea
              className="control-textarea"
              style={{ height: '90px' }}
              value={formData.table_calculations || ''}
              placeholder='[{"calculation": "pct_of_total", "metric": "fatturato"}]'
              onChange={(e) => onChange('table_calculations', e.target.value)}
            />
          </div>

          <div className="control-group">
            <label className="control-label" style={{ marginBottom: '6px' }}>
              Time Comparison & Period Variance (DoD / MoM / YoY)
            </label>
            <PeriodComparisonEditor
              formData={formData}
              availableDimensions={availableDimensions}
              records={records}
              onChange={onChange}
            />
          </div>
        </ControlAccordion>

        {/* 4. Display & Formatting (v0.8.0) */}
        <ControlAccordion title="Display & Formatting" icon="🎨" badge="v0.8.0" defaultOpen={true}>
          {/* Min/Max Visualization Mode */}
          <div className="control-group">
            <label className="control-label">Min / Max Cell Visualization</label>
            <select
              className="control-select"
              value={formData.min_max_display_mode || formData.minMaxDisplayMode || 'none'}
              onChange={(e) => onChange('min_max_display_mode', e.target.value)}
            >
              <option value="none">Disabled (Testo Standard)</option>
              <option value="badges">Min/Max Pill Badges (Badge Estremi)</option>
              <option value="heatmap">Cell Heatmap Gradient (Gradiente di Cella)</option>
              <option value="diverging_heatmap">Diverging Heatmap (3-Stop Continuo Polarizzato)</option>
              <option value="data_bars">In-Cell Data Bars (Barre Dati)</option>
              <option value="bipolar_data_bars">Bipolar Data Bars (Barre Bipolari Zero-Centered)</option>
            </select>
          </div>

          {/* Min/Max Scope */}
          {(formData.min_max_display_mode || formData.minMaxDisplayMode) !== 'none' && (
            <div className="control-group">
              <label className="control-label">Min/Max Calculation Scope</label>
              <select
                className="control-select"
                value={formData.min_max_scope || formData.minMaxScope || 'leaves_only'}
                onChange={(e) => onChange('min_max_scope', e.target.value)}
              >
                <option value="leaves_only">Leaf Nodes Only (Solo Nodi Foglia - Consigliato)</option>
                <option value="level_aware">By Hierarchy Level (Per Livello Gerarchico)</option>
                <option value="all_nodes">All Nodes Excl. Grand Total (Tutti i Nodi)</option>
              </select>
            </div>
          )}

          {/* Diverging Heatmap & Bipolar Bar Options */}
          {(formData.min_max_display_mode === 'diverging_heatmap' ||
            formData.minMaxDisplayMode === 'diverging_heatmap') && (
            <>
              <div className="control-group">
                <label className="control-label">Heatmap Palette</label>
                <select
                  className="control-select"
                  value={formData.heatmap_palette || formData.heatmapPalette || 'red_white_green'}
                  onChange={(e) => onChange('heatmap_palette', e.target.value)}
                >
                  <option value="red_white_green">Red - White - Green (Positivo Verde)</option>
                  <option value="blue_white_red">Blue - White - Red (Accessibile / Colorblind)</option>
                  <option value="red_yellow_green">Red - Yellow - Green (Semaforico)</option>
                  <option value="custom">Custom Theme Colors (Colori del Tema)</option>
                </select>
              </div>

              <div className="control-group">
                <label className="control-label">Diverging Midpoint Value (Centro Neutro)</label>
                <input
                  type="number"
                  className="control-input"
                  placeholder="Auto (0 se misto o media)"
                  value={formData.diverging_midpoint ?? formData.divergingMidpoint ?? ''}
                  onChange={(e) =>
                    onChange(
                      'diverging_midpoint',
                      e.target.value === '' ? undefined : Number(e.target.value),
                    )
                  }
                />
              </div>
            </>
          )}

          {/* Theme & Palette Profile */}
          <div className="control-group">
            <label className="control-label">Theme Palette Profile</label>
            <select
              className="control-select"
              value={formData.theme_profile || formData.themeProfile || formData.theme_palette || 'standard'}
              onChange={(e) => onChange('theme_profile', e.target.value)}
            >
              <option value="standard">Standard (Teal Navy)</option>
              <option value="colorblind">Colorblind Safe (Blu Okabe-Ito)</option>
              <option value="stratum-warm">Stratum Warm (Sunset Terracotta)</option>
              <option value="stratum-cool">Stratum Cool (Emerald Green)</option>
              <option value="custom">Custom Colors (Hex Personalizzati)</option>
            </select>
          </div>

          {/* Custom Hex Inputs if custom */}
          {(formData.theme_profile === 'custom' ||
            formData.themeProfile === 'custom' ||
            formData.theme_palette === 'custom') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
              <div>
                <label className="control-label" style={{ fontSize: '10px' }}>Positivo</label>
                <input
                  type="color"
                  value={formData.customPositiveHex || '#16a34a'}
                  onChange={(e) => onChange('customPositiveHex', e.target.value)}
                  style={{ width: '100%', height: '28px', padding: '1px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>
              <div>
                <label className="control-label" style={{ fontSize: '10px' }}>Neutro</label>
                <input
                  type="color"
                  value={formData.customNeutralHex || '#6b7280'}
                  onChange={(e) => onChange('customNeutralHex', e.target.value)}
                  style={{ width: '100%', height: '28px', padding: '1px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>
              <div>
                <label className="control-label" style={{ fontSize: '10px' }}>Negativo</label>
                <input
                  type="color"
                  value={formData.customNegativeHex || '#dc2626'}
                  onChange={(e) => onChange('customNegativeHex', e.target.value)}
                  style={{ width: '100%', height: '28px', padding: '1px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {/* Table Layout Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            <label className="control-toggle">
              <input
                type="checkbox"
                checked={formData.striped_rows !== false && formData.stripedRows !== false}
                onChange={(e) => onChange('striped_rows', e.target.checked)}
              />
              <span>Zebra Striped Rows (Righe alternate)</span>
            </label>

            <label className="control-toggle">
              <input
                type="checkbox"
                checked={Boolean(formData.compact_mode ?? formData.compactMode ?? false)}
                onChange={(e) => onChange('compact_mode', e.target.checked)}
              />
              <span>Compact Dense Spacing (Spaziatura densa)</span>
            </label>

            <label className="control-toggle">
              <input
                type="checkbox"
                checked={formData.sticky_header !== false && formData.stickyHeader !== false}
                onChange={(e) => onChange('sticky_header', e.target.checked)}
              />
              <span>Sticky Table Header (Intestazione fissa)</span>
            </label>

            <label className="control-toggle">
              <input
                type="checkbox"
                checked={formData.enable_search !== false && formData.enableSearch !== false}
                onChange={(e) => onChange('enable_search', e.target.checked)}
              />
              <span>Live Search Bar (Barra di ricerca gerarchica)</span>
            </label>
          </div>
        </ControlAccordion>

        {/* 5. Performance & Privacy (v0.7.0) */}
        <ControlAccordion title="Performance & Privacy" icon="🛡️" badge="v0.7.0" defaultOpen={true}>
          <label className="control-toggle">
            <input
              type="checkbox"
              checked={formData.virtualization_enabled !== false}
              onChange={(e) => onChange('virtualization_enabled', e.target.checked)}
            />
            <span>Enable Window Virtualization</span>
          </label>

          <div className="control-group">
            <label className="control-label">Virtualization Page Size: {formData.page_size || 100}</label>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={formData.page_size || 100}
              onChange={(e) => onChange('page_size', Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label className="control-label">Dimension Limits JSON (Top/Bottom N + Altri)</label>
            <textarea
              className="control-textarea"
              style={{ height: '80px' }}
              value={formData.dimension_limits || ''}
              placeholder='{"level_limits": [{"level": 2, "limit": 5, "aggregationLabel": "Altri"}]}'
              onChange={(e) => onChange('dimension_limits', e.target.value)}
            />
          </div>

          <div className="control-group">
            <label className="control-label">Small-Number Privacy Threshold (0 = off)</label>
            <input
              type="number"
              className="control-input"
              value={formData.suppression_threshold || 0}
              min="0"
              max="50"
              onChange={(e) => onChange('suppression_threshold', Number(e.target.value))}
            />
          </div>

          {Number(formData.suppression_threshold) > 0 && (
            <div className="control-group">
              <label className="control-label">Suppression Display Label</label>
              <input
                type="text"
                className="control-input"
                value={formData.suppression_label || '<5'}
                onChange={(e) => onChange('suppression_label', e.target.value)}
              />
            </div>
          )}
        </ControlAccordion>
      </div>
    </div>
  );
};
