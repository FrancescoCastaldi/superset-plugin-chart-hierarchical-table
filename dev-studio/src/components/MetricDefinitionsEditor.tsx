import React, { useState, useMemo } from 'react';
import {
  MetricDefinition,
  MetricType,
  MetricFormat,
  MetricPolarity,
  ConfidenceMethod,
  SignalReference,
} from '../../../src/types';

interface MetricDefinitionsEditorProps {
  metrics: string[];
  availableMetrics: string[];
  availableDimensions: string[];
  value: string | MetricDefinition[];
  onChange: (jsonString: string) => void;
}

export const MetricDefinitionsEditor: React.FC<MetricDefinitionsEditorProps> = ({
  metrics = [],
  availableMetrics = [],
  availableDimensions = [],
  value,
  onChange,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [customMetricName, setCustomMetricName] = useState('');

  // Parse existing definitions
  const definitions: MetricDefinition[] = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [value]);

  // Combined list of metrics to configure: active metrics in chart + any defined custom metrics
  const allMetricKeys = useMemo(() => {
    const set = new Set<string>();
    metrics.forEach((m) => set.add(m));
    definitions.forEach((d) => set.add(d.metric));
    return Array.from(set);
  }, [metrics, definitions]);

  // Helper to commit updated definitions
  const commitDefinitions = (nextDefs: MetricDefinition[]) => {
    // Clean up empty optional fields
    const cleaned = nextDefs.map((def) => {
      const clean: Record<string, any> = { metric: def.metric, type: def.type || 'sum' };
      if (def.type === 'mean' && def.weight) clean.weight = def.weight;
      if (def.type === 'distinct_count' && def.entityDimension) clean.entityDimension = def.entityDimension;
      if (def.type === 'ratio') {
        if (def.numerator) clean.numerator = def.numerator;
        if (def.denominator) clean.denominator = def.denominator;
        if (typeof def.scale === 'number') clean.scale = def.scale;
        if (def.ci && def.ci !== 'none') {
          clean.ci = def.ci;
          if (def.ciLevel) clean.ciLevel = def.ciLevel;
          if (def.compareTo) clean.compareTo = def.compareTo;
        }
      }
      if (def.type === 'delta_pct') {
        if (def.current) clean.current = def.current;
        if (def.baseline) clean.baseline = def.baseline;
      }
      if (def.format) clean.format = def.format;
      if (typeof def.decimals === 'number') clean.decimals = def.decimals;
      if (def.polarity) clean.polarity = def.polarity;
      return clean as MetricDefinition;
    });

    onChange(JSON.stringify(cleaned, null, 2));
  };

  // Update or insert a definition for a specific metric
  const handleUpdateDefinition = (metric: string, patch: Partial<MetricDefinition>) => {
    const existingIndex = definitions.findIndex((d) => d.metric === metric);
    let next: MetricDefinition[];
    if (existingIndex >= 0) {
      next = [...definitions];
      next[existingIndex] = { ...next[existingIndex], ...patch };
    } else {
      next = [...definitions, { metric, type: 'sum', ...patch }];
    }
    commitDefinitions(next);
  };

  // Remove custom definition (reverts to automatic default)
  const handleRemoveDefinition = (metric: string) => {
    const next = definitions.filter((d) => d.metric !== metric);
    commitDefinitions(next);
  };

  // Auto-suggest definitions based on heuristics
  const handleAutoSuggest = () => {
    const next: MetricDefinition[] = [];
    for (const m of allMetricKeys) {
      const lower = m.toLowerCase();
      let type: MetricType = 'sum';
      let format: MetricFormat | undefined;
      let decimals: number | undefined;
      let polarity: MetricPolarity | undefined;
      let weight: string | undefined;

      if (lower.includes('pct') || lower.includes('%') || lower.includes('tasso') || lower.includes('quota') || lower.includes('margine')) {
        format = 'percent';
        decimals = 1;
        if (lower.includes('delta')) {
          type = 'delta_pct';
        } else {
          type = 'mean';
          // Find potential weight column
          const potentialWeight = availableMetrics.find(
            (om) => om !== m && (om.includes('ricoveri') || om.includes('volume') || om.includes('fatturato') || om.includes('totale'))
          );
          if (potentialWeight) weight = potentialWeight;
        }
      } else if (lower.includes('tempo') || lower.includes('gg') || lower.includes('giorni') || lower.includes('durata') || lower.includes('attesa')) {
        type = 'mean';
        format = 'decimal';
        decimals = 1;
        polarity = 'lower_is_better';
        const potentialWeight = availableMetrics.find(
          (om) => om !== m && (om.includes('ricoveri') || om.includes('volume') || om.includes('casi'))
        );
        if (potentialWeight) weight = potentialWeight;
      } else if (lower.includes('costo') || lower.includes('spesa') || lower.includes('reclami') || lower.includes('errori')) {
        polarity = 'lower_is_better';
      } else if (lower.includes('fatturato') || lower.includes('importo') || lower.includes('ricavi') || lower.includes('prezzo')) {
        format = 'currency';
      }

      next.push({
        metric: m,
        type,
        ...(weight ? { weight } : {}),
        ...(format ? { format } : {}),
        ...(decimals !== undefined ? { decimals } : {}),
        ...(polarity ? { polarity } : {}),
      });
    }
    commitDefinitions(next);
  };

  // Add custom metric (e.g. calculated ratio)
  const handleAddCustomMetric = () => {
    const name = customMetricName.trim();
    if (!name || allMetricKeys.includes(name)) return;
    const next: MetricDefinition[] = [...definitions, { metric: name, type: 'ratio' }];
    commitDefinitions(next);
    setCustomMetricName('');
    setExpandedMetric(name);
  };

  return (
    <div className="metric-definitions-manager">
      {/* View Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className={`btn-pill ${viewMode === 'visual' ? 'primary' : ''}`}
            style={{ fontSize: '11px', padding: '3px 8px' }}
            onClick={() => setViewMode('visual')}
          >
            🎨 Vista Visuale
          </button>
          <button
            type="button"
            className={`btn-pill ${viewMode === 'json' ? 'primary' : ''}`}
            style={{ fontSize: '11px', padding: '3px 8px' }}
            onClick={() => setViewMode('json')}
          >
            📄 JSON Raw
          </button>
        </div>

        {viewMode === 'visual' && (
          <button
            type="button"
            className="btn-pill"
            style={{ fontSize: '10px', padding: '2px 6px', color: '#58a6ff' }}
            title="Genera impostazioni consigliate per le metriche attive"
            onClick={handleAutoSuggest}
          >
            ⚡ Auto-Configura
          </button>
        )}
      </div>

      {viewMode === 'json' ? (
        <textarea
          className="control-textarea"
          style={{ height: '140px' }}
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          placeholder='[{"metric": "volume", "type": "sum"}]'
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="metric-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {allMetricKeys.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 0' }}>
              Nessuna metrica selezionata nel chart.
            </div>
          ) : (
            allMetricKeys.map((metricKey) => {
              const def = definitions.find((d) => d.metric === metricKey) || {
                metric: metricKey,
                type: 'sum' as MetricType,
              };
              const isCustomized = definitions.some((d) => d.metric === metricKey);
              const isExpanded = expandedMetric === metricKey;

              return (
                <div
                  key={metricKey}
                  style={{
                    background: isCustomized ? 'var(--bg-card)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isExpanded ? 'var(--accent-blue)' : isCustomized ? 'var(--border-color)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => setExpandedMetric(isExpanded ? null : metricKey)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        {metricKey}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: def.type === 'sum' ? 'rgba(139, 148, 158, 0.2)' : 'rgba(47, 129, 247, 0.2)',
                          color: def.type === 'sum' ? 'var(--text-muted)' : '#58a6ff',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                        }}
                      >
                        {def.type === 'sum'
                          ? 'Somma'
                          : def.type === 'mean'
                          ? def.weight
                            ? `Media pond. (${def.weight})`
                            : 'Media aritm.'
                          : def.type === 'ratio'
                          ? 'Rapporto'
                          : def.type === 'delta_pct'
                          ? 'Delta %'
                          : def.type === 'distinct_count'
                          ? 'Distinti'
                          : 'No rollup'}
                      </span>

                      {def.format && (
                        <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '4px', background: 'rgba(210, 153, 34, 0.2)', color: '#d29922' }}>
                          {def.format}
                        </span>
                      )}

                      {def.polarity && (
                        <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '4px', background: def.polarity === 'lower_is_better' ? 'rgba(35, 134, 54, 0.2)' : 'rgba(56, 139, 253, 0.2)', color: def.polarity === 'lower_is_better' ? '#7ee787' : '#79c0ff' }}>
                          {def.polarity === 'lower_is_better' ? '▼ min' : '▲ max'}
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Card Expanded Controls */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '8px',
                        borderTop: '1px solid var(--border-color)',
                        background: 'var(--bg-panel)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        fontSize: '11px',
                      }}
                    >
                      {/* 1. Rollup Type */}
                      <div className="control-group">
                        <label className="control-label">Tipo Rollup (Padri e Grand Total)</label>
                        <select
                          className="control-select"
                          value={def.type || 'sum'}
                          onChange={(e) => handleUpdateDefinition(metricKey, { type: e.target.value as MetricType })}
                        >
                          <option value="sum">Somma (sum) - Default per volumi e conteggi</option>
                          <option value="mean">Media (mean) - Aritmetica o ponderata su pesi</option>
                          <option value="ratio">Rapporto (ratio) - Numeratore / Denominatore</option>
                          <option value="delta_pct">Delta % (delta_pct) - Variazione vs Baseline</option>
                          <option value="distinct_count">Conteggio Distinto (distinct_count) - MAX / SUM</option>
                          <option value="none">Nessun Rollup (none) - Vuoto su subtotali</option>
                        </select>
                      </div>

                      {/* Dynamic: If Mean -> Weight Metric */}
                      {def.type === 'mean' && (
                        <div className="control-group">
                          <label className="control-label">Metrica di Ponderazione (Peso)</label>
                          <select
                            className="control-select"
                            value={def.weight || ''}
                            onChange={(e) => handleUpdateDefinition(metricKey, { weight: e.target.value || undefined })}
                          >
                            <option value="">Media Aritmetica Semplice (senza peso)</option>
                            {availableMetrics
                              .filter((m) => m !== metricKey)
                              .map((m) => (
                                <option key={m} value={m}>
                                  Pondera su metrica: {m}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {/* Dynamic: If Distinct Count -> Entity Dimension */}
                      {def.type === 'distinct_count' && (
                        <div className="control-group">
                          <label className="control-label">Dimensione Entità (MAX su rami, SUM sopra)</label>
                          <select
                            className="control-select"
                            value={def.entityDimension || ''}
                            onChange={(e) => handleUpdateDefinition(metricKey, { entityDimension: e.target.value || undefined })}
                          >
                            <option value="">Seleziona dimensione entità...</option>
                            {availableDimensions.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Dynamic: If Ratio -> Numerator & Denominator & CI */}
                      {def.type === 'ratio' && (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div className="control-group">
                              <label className="control-label">Numeratore</label>
                              <select
                                className="control-select"
                                value={def.numerator || ''}
                                onChange={(e) => handleUpdateDefinition(metricKey, { numerator: e.target.value || undefined })}
                              >
                                <option value="">Seleziona...</option>
                                {availableMetrics.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="control-group">
                              <label className="control-label">Denominatore</label>
                              <select
                                className="control-select"
                                value={def.denominator || ''}
                                onChange={(e) => handleUpdateDefinition(metricKey, { denominator: e.target.value || undefined })}
                              >
                                <option value="">Seleziona...</option>
                                {availableMetrics.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div className="control-group">
                              <label className="control-label">Fattore di Scala</label>
                              <input
                                type="number"
                                className="control-input"
                                value={def.scale ?? 100}
                                placeholder="100 per %, 1000 per mille"
                                onChange={(e) => handleUpdateDefinition(metricKey, { scale: Number(e.target.value) || 1 })}
                              />
                            </div>

                            <div className="control-group">
                              <label className="control-label">Intervallo di Confidenza</label>
                              <select
                                className="control-select"
                                value={def.ci || 'none'}
                                onChange={(e) => handleUpdateDefinition(metricKey, { ci: e.target.value as ConfidenceMethod })}
                              >
                                <option value="none">Nessuno (Disabilitato)</option>
                                <option value="wilson">Wilson Score (Proporzioni)</option>
                                <option value="poisson">Poisson (Tassi su popolazione)</option>
                              </select>
                            </div>
                          </div>

                          {def.ci && def.ci !== 'none' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              <div className="control-group">
                                <label className="control-label">Livello Confidenza</label>
                                <select
                                  className="control-select"
                                  value={def.ciLevel ?? 0.95}
                                  onChange={(e) => handleUpdateDefinition(metricKey, { ciLevel: Number(e.target.value) })}
                                >
                                  <option value={0.9}>90% (1.645σ)</option>
                                  <option value={0.95}>95% (1.96σ)</option>
                                  <option value={0.99}>99% (2.576σ)</option>
                                  <option value={0.998}>99.8% (3σ)</option>
                                </select>
                              </div>

                              <div className="control-group">
                                <label className="control-label">Confronta Segnale con</label>
                                <select
                                  className="control-select"
                                  value={def.compareTo || 'parent'}
                                  onChange={(e) => handleUpdateDefinition(metricKey, { compareTo: e.target.value as SignalReference })}
                                >
                                  <option value="parent">Valore del Padre</option>
                                  <option value="total">Grand Total della Tabella</option>
                                  <option value="goal">Target / Obiettivo impostato</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Dynamic: If Delta % -> Current & Baseline */}
                      {def.type === 'delta_pct' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div className="control-group">
                            <label className="control-label">Metrica Corrente</label>
                            <select
                              className="control-select"
                              value={def.current || ''}
                              onChange={(e) => handleUpdateDefinition(metricKey, { current: e.target.value || undefined })}
                            >
                              <option value="">Seleziona...</option>
                              {availableMetrics.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="control-group">
                            <label className="control-label">Metrica Baseline (Confronto)</label>
                            <select
                              className="control-select"
                              value={def.baseline || ''}
                              onChange={(e) => handleUpdateDefinition(metricKey, { baseline: e.target.value || undefined })}
                            >
                              <option value="">Seleziona...</option>
                              {availableMetrics.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* 2. Format & Decimals */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '6px' }}>
                        <div className="control-group">
                          <label className="control-label">Formattazione Numero</label>
                          <select
                            className="control-select"
                            value={def.format || ''}
                            onChange={(e) => handleUpdateDefinition(metricKey, { format: (e.target.value || undefined) as MetricFormat })}
                          >
                            <option value="">Automatico (SMART_NUMBER)</option>
                            <option value="integer">Intero (1.234)</option>
                            <option value="decimal">Decimale (1.234,56)</option>
                            <option value="percent">Percentuale (12,3%)</option>
                            <option value="currency">Valuta (€ / $)</option>
                            <option value="duration">Durata (mm:ss)</option>
                            <option value="days">Giorni (es. 4.2 gg)</option>
                          </select>
                        </div>

                        <div className="control-group">
                          <label className="control-label">Decimali</label>
                          <select
                            className="control-select"
                            value={def.decimals ?? ''}
                            onChange={(e) =>
                              handleUpdateDefinition(metricKey, {
                                decimals: e.target.value === '' ? undefined : Number(e.target.value),
                              })
                            }
                          >
                            <option value="">Auto</option>
                            <option value={0}>0 (123)</option>
                            <option value={1}>1 (123,4)</option>
                            <option value={2}>2 (123,45)</option>
                            <option value={3}>3 (123,456)</option>
                          </select>
                        </div>
                      </div>

                      {/* 3. Polarity */}
                      <div className="control-group">
                        <label className="control-label">Polarità Valori (Direzione Migliorativa)</label>
                        <select
                          className="control-select"
                          value={def.polarity || ''}
                          onChange={(e) =>
                            handleUpdateDefinition(metricKey, {
                              polarity: (e.target.value || undefined) as MetricPolarity,
                            })
                          }
                        >
                          <option value="">Standard / Positivo Alto</option>
                          <option value="higher_is_better">Valori Alti Migliori (Verde su aumenti - es. Ricoveri, Fatturato)</option>
                          <option value="lower_is_better">Valori Bassi Migliori (Verde su cali - es. Tempi attesa, Costi)</option>
                        </select>
                      </div>

                      {/* Reset Button */}
                      {isCustomized && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                          <button
                            type="button"
                            className="btn-pill"
                            style={{ fontSize: '10px', color: '#ff8182', padding: '2px 8px' }}
                            onClick={() => handleRemoveDefinition(metricKey)}
                          >
                            ↺ Ripristina Default
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Add custom calculated metric */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <input
              type="text"
              className="control-input"
              style={{ flex: 1, padding: '4px 8px', fontSize: '11px' }}
              value={customMetricName}
              placeholder="Nuova metrica calcolata..."
              onChange={(e) => setCustomMetricName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustomMetric();
              }}
            />
            <button
              type="button"
              className="btn-pill"
              disabled={!customMetricName.trim()}
              style={{ fontSize: '11px', padding: '4px 8px' }}
              onClick={handleAddCustomMetric}
            >
              + Aggiungi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
