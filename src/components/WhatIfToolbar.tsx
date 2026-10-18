import React, { useState, useCallback, useMemo } from 'react';
import { WhatIfAdjustment, WhatIfScenario, MetricDefinition } from '../types';
import {
  factorToPercentage,
  percentageToFactor,
  getSimulatableMetrics,
} from '../utils/whatIfEngine';
import './WhatIfToolbar.css';

export interface WhatIfToolbarProps {
  metrics: string[];
  metricDefinitions?: MetricDefinition[];
  adjustments: WhatIfAdjustment[];
  onAdjustmentsChange: (adjustments: WhatIfAdjustment[]) => void;
  onReset: () => void;
  onSaveScenario?: (name: string) => void;
  onLoadScenario?: (scenario: WhatIfScenario) => void;
  onExportWithSimulation?: () => void;
  savedScenarios?: WhatIfScenario[];
  activeScenarioName?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const WhatIfToolbar: React.FC<WhatIfToolbarProps> = ({
  metrics,
  metricDefinitions,
  adjustments,
  onAdjustmentsChange,
  onReset,
  onSaveScenario,
  onLoadScenario,
  onExportWithSimulation,
  savedScenarios = [],
  activeScenarioName,
  isExpanded: controlledExpanded,
  onToggleExpand,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const [isSavingInline, setIsSavingInline] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');

  const simulatableMetrics = useMemo(() => {
    return getSimulatableMetrics(metrics, metricDefinitions);
  }, [metrics, metricDefinitions]);

  const activeFactorsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const adj of adjustments) {
      map.set(adj.metric, adj.factor);
    }
    return map;
  }, [adjustments]);

  const activeAdjustmentsCount = useMemo(() => {
    return adjustments.filter(a => a.factor !== 1).length;
  }, [adjustments]);

  const handleToggle = useCallback(() => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(prev => !prev);
    }
  }, [onToggleExpand]);

  const handlePercentageChange = useCallback(
    (metric: string, percentage: number) => {
      const factor = percentageToFactor(percentage);
      const nextAdjustments = adjustments.filter(a => a.metric !== metric);
      if (factor !== 1) {
        nextAdjustments.push({ metric, factor });
      }
      onAdjustmentsChange(nextAdjustments);
    },
    [adjustments, onAdjustmentsChange],
  );

  const handleSaveSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newScenarioName.trim();
      if (trimmed && onSaveScenario) {
        onSaveScenario(trimmed);
        setNewScenarioName('');
        setIsSavingInline(false);
      }
    },
    [newScenarioName, onSaveScenario],
  );

  const handleSelectScenario = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      if (!id) return;
      const target = savedScenarios.find(s => s.id === id);
      if (target && onLoadScenario) {
        onLoadScenario(target);
      }
    },
    [savedScenarios, onLoadScenario],
  );

  return (
    <div className="whatif-toolbar-container">
      <div className="whatif-header">
        <div className="whatif-header-left">
          <button
            type="button"
            className={`whatif-title-btn ${isExpanded ? 'active' : ''}`}
            onClick={handleToggle}
            title="Apri o chiudi il pannello What-If"
          >
            <span>🪄 What-If Simulation</span>
            <span>{isExpanded ? '▲' : '▼'}</span>
          </button>

          {activeAdjustmentsCount > 0 && (
            <span className="whatif-badge-active">
              ● {activeScenarioName ? activeScenarioName : `Simulazione attiva (${activeAdjustmentsCount} metriche)`}
            </span>
          )}
        </div>

        <div className="whatif-header-right">
          {activeAdjustmentsCount > 0 && (
            <button
              type="button"
              className="whatif-btn whatif-btn-reset"
              onClick={onReset}
              title="Azzera tutte le variazioni simulate e ripristina i dati storici"
            >
              ✕ Reset Baseline
            </button>
          )}

          {onExportWithSimulation && activeAdjustmentsCount > 0 && (
            <button
              type="button"
              className="whatif-btn"
              onClick={onExportWithSimulation}
              title="Scarica CSV con colonne base, simulate e delta %"
            >
              📥 Esporta CSV Simulato
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="whatif-body">
          <div className="whatif-slider-grid">
            {simulatableMetrics.map(metric => {
              const factor = activeFactorsMap.get(metric) ?? 1.0;
              const pct = factorToPercentage(factor);
              const pctClass = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
              const formattedPct = pct > 0 ? `+${pct}%` : `${pct}%`;

              return (
                <div key={metric} className="whatif-slider-row">
                  <div className="whatif-slider-header">
                    <span className="whatif-metric-name" title={metric}>
                      {metric}
                    </span>
                    <span className={`whatif-pct-badge ${pctClass}`}>
                      {formattedPct}
                    </span>
                  </div>

                  <div className="whatif-slider-controls">
                    <input
                      type="range"
                      className="whatif-slider-input"
                      min="-50"
                      max="50"
                      step="1"
                      value={pct}
                      onChange={e => handlePercentageChange(metric, Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="whatif-number-input"
                      min="-100"
                      max="500"
                      value={pct}
                      onChange={e => handlePercentageChange(metric, Number(e.target.value))}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="whatif-actions">
            <div className="whatif-actions-left">
              {onSaveScenario && (
                <>
                  {!isSavingInline ? (
                    <button
                      type="button"
                      className="whatif-btn whatif-btn-primary"
                      onClick={() => setIsSavingInline(true)}
                      disabled={activeAdjustmentsCount === 0}
                      title="Salva la configurazione attuale come preset nominato"
                    >
                      💾 Salva Scenario
                    </button>
                  ) : (
                    <form className="whatif-save-inline" onSubmit={handleSaveSubmit}>
                      <input
                        type="text"
                        className="whatif-save-input"
                        placeholder="Nome scenario (es. Ottimistico +10%)..."
                        value={newScenarioName}
                        onChange={e => setNewScenarioName(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="whatif-btn whatif-btn-primary">
                        Salva
                      </button>
                      <button
                        type="button"
                        className="whatif-btn"
                        onClick={() => {
                          setIsSavingInline(false);
                          setNewScenarioName('');
                        }}
                      >
                        Annulla
                      </button>
                    </form>
                  )}
                </>
              )}

              {savedScenarios.length > 0 && onLoadScenario && (
                <select
                  className="whatif-scenario-select"
                  onChange={handleSelectScenario}
                  defaultValue=""
                  title="Carica uno scenario salvato in precedenza"
                >
                  <option value="" disabled>
                    📂 Carica Scenario ({savedScenarios.length})...
                  </option>
                  {savedScenarios.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="whatif-actions-right">
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                * Le percentuali agiscono sui record foglia e riaggregano l'intero albero
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatIfToolbar;
