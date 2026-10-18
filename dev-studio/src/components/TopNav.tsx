import React from 'react';
import { ALL_SCENARIOS } from '../mockData';

interface TopNavProps {
  currentScenarioId: string;
  onSelectScenario: (id: string) => void;
  onResetFormData: () => void;
  onCopyConfig: () => void;
  onOpenApiModal: () => void;
  rowCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentScenarioId,
  onSelectScenario,
  onResetFormData,
  onCopyConfig,
  onOpenApiModal,
  rowCount,
}) => {
  return (
    <header className="studio-header">
      <div className="studio-logo">
        <span style={{ fontSize: '18px' }}>🌲</span>
        <span>StratumTree Live Dev Studio</span>
        <span className="studio-badge">Apache Superset 6.1.0</span>
      </div>

      <div className="studio-nav-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scenario:</span>
          <select
            className="preset-select"
            value={currentScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
          >
            {ALL_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {rowCount.toLocaleString('it-IT')} righe sorgente
        </span>

        <button type="button" className="btn-pill" onClick={onResetFormData} title="Ripristina valori predefiniti dello scenario">
          ↺ Reset Preset
        </button>

        <button type="button" className="btn-pill primary" onClick={onCopyConfig} title="Copia formData JSON negli appunti">
          📋 Copia Config
        </button>

        <button
          type="button"
          className="btn-pill"
          style={{ background: '#6e40c9', borderColor: '#8957e5', color: '#ffffff', fontWeight: 600 }}
          onClick={onOpenApiModal}
          title="Integrazione Superset REST API: Genera ed esegui POST /api/v1/chart/"
        >
          🌐 Esporta API (POST /api/v1/chart/)
        </button>
      </div>
    </header>
  );
};
