import React, { useMemo } from 'react';
import { parsePeriodKey } from '../../../src/utils/timeComparison';

interface PeriodComparisonEditorProps {
  formData: any;
  availableDimensions: string[];
  records: any[];
  onChange: (key: string, value: any) => void;
}

export const PeriodComparisonEditor: React.FC<PeriodComparisonEditorProps> = ({
  formData,
  availableDimensions = [],
  records = [],
  onChange,
}) => {
  // Current form values with aliases
  const pivotColumns: string[] = useMemo(() => {
    const cols = formData.columns || formData.pivot_columns || formData.pivotColumns;
    if (Array.isArray(cols)) return cols;
    if (typeof cols === 'string' && cols.trim() !== '') return [cols];
    return [];
  }, [formData.columns, formData.pivot_columns, formData.pivotColumns]);

  const strategy = formData.comparisonStrategy || formData.comparisonType || 'prev_period';
  const referencePeriod = formData.comparisonReferencePeriod || formData.referencePeriod || 'current';
  const timeGrain = formData.comparisonTimeGrain || formData.timeGrain || 'month';
  const showVarianceDelta = Boolean(formData.showVarianceDelta ?? formData.show_variance_delta);
  const pivotTimeDeltaMode = formData.pivotTimeDeltaMode || formData.pivot_time_delta_mode || 'none';
  const pivotTimeDeltaLag = Number(formData.pivotTimeDeltaLag || formData.pivot_time_delta_lag || 1);

  // Active status: is the reference period delta column currently active?
  const isPeriodComparisonActive =
    pivotColumns.length === 1 &&
    ((strategy === 'prev_period' && referencePeriod !== 'current') ||
      strategy === 'prev_year_same_period' ||
      strategy === 'budget_target');

  // Detect candidate temporal / datetime columns from the database / dataset
  const temporalCandidates = useMemo(() => {
    const list: { col: string; reason: string; sample: string }[] = [];
    const dateRegex = /date|data|time|timestamp|anno|year|mese|month|trimestre|quarter|periodo|giorno|day|__timestamp/i;

    for (const dim of availableDimensions) {
      const matchesName = dateRegex.test(dim);
      let parsesDate = false;
      let sampleVal = '';
      for (const rec of records.slice(0, 10)) {
        if (rec[dim] !== undefined && rec[dim] !== null) {
          sampleVal = String(rec[dim]);
          if (parsePeriodKey(sampleVal)) {
            parsesDate = true;
            break;
          }
        }
      }

      if (matchesName || parsesDate) {
        list.push({
          col: dim,
          reason: parsesDate ? 'Valori data riconosciuti' : 'Nome colonna temporale',
          sample: sampleVal || 'N/A',
        });
      }
    }
    return list;
  }, [availableDimensions, records]);

  // Inspect the active pivot column values
  const activePivotInspection = useMemo(() => {
    if (pivotColumns.length !== 1) return null;
    const col = pivotColumns[0];
    const sampleValues: string[] = [];
    let validCount = 0;

    for (const rec of records) {
      const val = rec[col];
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        if (!sampleValues.includes(strVal) && sampleValues.length < 5) {
          sampleValues.push(strVal);
        }
        if (parsePeriodKey(strVal)) {
          validCount++;
        }
      }
    }

    const isValid = sampleValues.some((v) => Boolean(parsePeriodKey(v)));
    return {
      col,
      sampleValues,
      validCount,
      isValid,
    };
  }, [pivotColumns, records]);

  // Handler to set a temporal column as the pivot column
  const handleSetPivotColumn = (colName: string) => {
    onChange('columns', [colName]);
    onChange('pivot_columns', [colName]);
    onChange('pivotColumns', [colName]);

    if (referencePeriod === 'current') {
      onChange('comparisonReferencePeriod', 'previous');
      onChange('referencePeriod', 'previous');
      onChange('comparisonStrategy', 'prev_period');
      onChange('comparisonType', 'prev_period');
    }
  };

  // Handler to completely remove time comparison and revert to flat table
  const handleRemovePivotColumn = () => {
    onChange('columns', []);
    onChange('pivot_columns', []);
    onChange('pivotColumns', []);
    onChange('comparisonReferencePeriod', 'current');
    onChange('referencePeriod', 'current');
    onChange('pivotTimeDeltaMode', 'none');
    onChange('pivot_time_delta_mode', 'none');
  };

  // Handler to toggle reference period delta
  const handleToggleDelta = (enabled: boolean) => {
    if (enabled) {
      if (pivotColumns.length === 0) {
        const targetCol = temporalCandidates[0]?.col || 'mese';
        handleSetPivotColumn(targetCol);
      }
      onChange('comparisonStrategy', strategy === 'none' ? 'prev_period' : strategy);
      onChange('comparisonType', strategy === 'none' ? 'prev_period' : strategy);
      onChange('comparisonReferencePeriod', 'previous');
      onChange('referencePeriod', 'previous');
    } else {
      onChange('comparisonReferencePeriod', 'current');
      onChange('referencePeriod', 'current');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Master Action Bar (Add or Remove Time Comparison) */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{pivotColumns.length === 1 ? '⏱️ Confronto Temporale Attivo' : '⏱️ Confronto Temporale (Time Comparison)'}</span>
            {pivotColumns.length === 1 && (
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                }}
              >
                {pivotColumns[0]}
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            {pivotColumns.length === 1
              ? `Asse pivot temporale: ${pivotColumns[0]}. Puoi cambiare asse o rimuoverlo con 1 click.`
              : 'Analizza scostamenti, andamento periodale (DoD / MoM / YoY) e badge di variazione.'}
          </div>
        </div>

        {pivotColumns.length === 1 ? (
          <button
            type="button"
            onClick={handleRemovePivotColumn}
            style={{
              background: '#7f1d1d',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Rimuovi la colonna temporale pivot e torna alla tabella flat"
          >
            <span>✕</span>
            <span>Rimuovi Confronto</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSetPivotColumn(temporalCandidates[0]?.col || 'mese')}
            style={{
              background: '#1e293b',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Attiva la colonna temporale pivot per abilitare i confronti"
          >
            <span>⚡</span>
            <span>Aggiungi ({temporalCandidates[0]?.col || 'mese'})</span>
          </button>
        )}
      </div>

      {/* 2. Diagnostic & Axis Selection Banner */}
      {pivotColumns.length === 0 ? (
        <div
          style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '6px',
            padding: '10px 12px',
            fontSize: '12px',
            color: '#cbd5e1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#facc15', fontWeight: 600, marginBottom: '4px' }}>
            <span>💡</span>
            <span>Tabella in modalità Flat (Nessun Asse Temporale Orizzontale)</span>
          </div>
          <p style={{ margin: '0 0 8px 0', lineHeight: '1.4' }}>
            Seleziona una colonna data/periodo per proiettare la tabella in matrice temporale e abilitare i delta:
          </p>

          {temporalCandidates.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {temporalCandidates.map((c) => (
                <button
                  key={c.col}
                  type="button"
                  onClick={() => handleSetPivotColumn(c.col)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={`Imposta ${c.col} come asse temporale (${c.reason})`}
                >
                  <span>📅 Imposta <strong>{c.col}</strong> come Asse</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Nessuna colonna temporale rilevata automaticamente. Puoi comunque selezionarne una da <strong>1. Data -&gt; Columns (Pivot)</strong>.
            </div>
          )}
        </div>
      ) : pivotColumns.length > 1 ? (
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            padding: '10px 12px',
            fontSize: '12px',
            color: '#cbd5e1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontWeight: 600, marginBottom: '4px' }}>
            <span>ℹ️</span>
            <span>Multi-Pivot Attivo ({pivotColumns.join(' × ')})</span>
          </div>
          <p style={{ margin: 0, lineHeight: '1.4' }}>
            Il confronto period-over-period analizza 1 asse orizzontale. Con multi-pivot usa <strong>Table Calculations (% Totale, Running Total)</strong>.
          </p>
        </div>
      ) : (
        /* Exactly 1 pivot column */
        <div
          style={{
            background: activePivotInspection?.isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${activePivotInspection?.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#cbd5e1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600, color: activePivotInspection?.isValid ? '#34d399' : '#f87171' }}>
              {activePivotInspection?.isValid ? '✅ Asse Pivot Convalidato' : '⚠️ Formato Date Non Riconosciuto'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <code style={{ background: '#0f172a', padding: '1px 5px', borderRadius: '3px', color: '#38bdf8' }}>
                {pivotColumns[0]}
              </code>
              {temporalCandidates.length > 1 && (
                <select
                  className="control-select"
                  style={{ padding: '1px 4px', fontSize: '11px', width: 'auto' }}
                  value={pivotColumns[0]}
                  onChange={(e) => handleSetPivotColumn(e.target.value)}
                >
                  {temporalCandidates.map((t) => (
                    <option key={t.col} value={t.col}>
                      {t.col}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            Valori campione: {activePivotInspection?.sampleValues.map((v) => `'${v}'`).join(', ') || 'Nessun valore'}
          </div>
        </div>
      )}

      {/* 3. Reference Period Comparison Column (End of Grid) */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc' }}>
              Colonna Delta Periodo (Δ vs Riferimento)
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Aggiunge a fine tabella la colonna con scostamento assoluto (Δ) e percentuale (Δ%)
            </div>
          </div>
          <label className="control-toggle" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={isPeriodComparisonActive}
              onChange={(e) => handleToggleDelta(e.target.checked)}
            />
            <span />
          </label>
        </div>

        {/* Detailed Controls when active */}
        {isPeriodComparisonActive && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
            {/* Strategy */}
            <div>
              <label className="control-label">Strategia di Confronto (Comparison Baseline)</label>
              <select
                className="control-select"
                value={strategy}
                onChange={(e) => {
                  onChange('comparisonStrategy', e.target.value);
                  onChange('comparisonType', e.target.value);
                }}
              >
                <option value="prev_period">Periodo Precedente (DoD / WoW / MoM / QoQ / YoY)</option>
                <option value="prev_year_same_period">Stesso Periodo Anno Scorso (YoY - 12 mesi fa)</option>
                <option value="budget_target">Target / Budget Pianificato (da Metric Goals)</option>
              </select>
            </div>

            {/* Reference Period (shown when prev_period) */}
            {strategy === 'prev_period' && (
              <div>
                <label className="control-label">Periodo di Riferimento (Reference Baseline)</label>
                <select
                  className="control-select"
                  value={referencePeriod}
                  onChange={(e) => {
                    onChange('comparisonReferencePeriod', e.target.value);
                    onChange('referencePeriod', e.target.value);
                  }}
                >
                  <option value="previous">Ultimo periodo vs precedente (Δ vs previous period)</option>
                  <option value="ytd">Media progressiva Year-to-Date (Δ vs YTD average)</option>
                  <option value="current">Periodo corrente vs se stesso (Delta zero)</option>
                </select>
              </div>
            )}

            {/* Time Grain */}
            <div>
              <label className="control-label">Granularità Temporale (Time Grain)</label>
              <select
                className="control-select"
                value={timeGrain}
                onChange={(e) => {
                  onChange('comparisonTimeGrain', e.target.value);
                  onChange('timeGrain', e.target.value);
                }}
              >
                <option value="day">📅 Giorno (DoD - Day-over-Day)</option>
                <option value="week">📆 Settimana (WoW - Week-over-Week)</option>
                <option value="month">🗓️ Mese (MoM - Month-over-Month)</option>
                <option value="quarter">📊 Trimestre (QoQ - Quarter-over-Quarter)</option>
                <option value="year">📈 Anno (YoY - Year-over-Year)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. In-Grid Native Pivot Column Deltas (pivotTimeDeltaMode) */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '10px 12px',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc', marginBottom: '2px' }}>
          Delta Nativi Colonne Pivot (Variazione su ciascun periodo)
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
          Calcola automaticamente il delta temporale colonna-per-colonna lungo i periodi pivot
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label className="control-label" style={{ fontSize: '10px' }}>Tipo di Delta</label>
            <select
              className="control-select"
              value={pivotTimeDeltaMode}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'none' && pivotColumns.length === 0) {
                  handleSetPivotColumn(temporalCandidates[0]?.col || 'mese');
                }
                onChange('pivotTimeDeltaMode', val);
                onChange('pivot_time_delta_mode', val);
              }}
            >
              <option value="none">Nessuno (Solo valori)</option>
              <option value="percentage">Delta Percentuale (Δ%)</option>
              <option value="absolute">Delta Assoluto (Δ)</option>
              <option value="both">Entrambi (Δ e Δ%)</option>
            </select>
          </div>

          <div>
            <label className="control-label" style={{ fontSize: '10px' }}>Passo Temporale (Lag)</label>
            <select
              className="control-select"
              value={pivotTimeDeltaLag}
              disabled={pivotTimeDeltaMode === 'none'}
              onChange={(e) => {
                onChange('pivotTimeDeltaLag', Number(e.target.value));
                onChange('pivot_time_delta_lag', Number(e.target.value));
              }}
            >
              <option value={1}>1 Periodo (MoM / QoQ)</option>
              <option value={2}>2 Periodi</option>
              <option value={3}>3 Periodi</option>
              <option value={12}>12 Periodi (Stesso mese anno prec.)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Variance Badges Toggle */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc' }}>
              Mostra Badge Variazione (Δ%) sulle celle numeriche
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Renderizza i pill colorati con freccia (▲ +10.3% / ▼ -2.1%) direttamente dentro le celle numeriche
            </div>
          </div>
          <label className="control-toggle" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={showVarianceDelta}
              onChange={(e) => {
                onChange('showVarianceDelta', e.target.checked);
                onChange('show_variance_delta', e.target.checked);
              }}
            />
            <span />
          </label>
        </div>
      </div>

      {/* 6. Live Explanation / Result Preview */}
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '10px 12px',
          fontSize: '11px',
          lineHeight: '1.5',
          color: '#94a3b8',
        }}
      >
        <strong style={{ color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span>🎯</span>
          <span>Risultato calcolato in tabella:</span>
        </strong>

        {pivotColumns.length === 1 ? (
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            <li>
              Asse temporale attivo: <strong style={{ color: '#38bdf8' }}>{pivotColumns[0]}</strong>.
            </li>
            {isPeriodComparisonActive && (
              <li>
                Colonna finale di scostamento: <strong style={{ color: '#34d399' }}>{referencePeriod === 'ytd' ? 'Δ vs YTD average' : 'Δ vs previous period'}</strong> con valori assoluti e scostamento percentuale.
              </li>
            )}
            {pivotTimeDeltaMode !== 'none' && (
              <li>
                Colonne di variazione periodale nativa: <strong style={{ color: '#f59e0b' }}>{pivotTimeDeltaMode === 'both' ? 'Δ e Δ%' : pivotTimeDeltaMode}</strong> con passo lag {pivotTimeDeltaLag} periodo/i.
              </li>
            )}
            {showVarianceDelta && (
              <li>
                Badge variazione: <strong style={{ color: '#10b981' }}>Attivi</strong>. Ogni cella numerica visualizza il pill colorato di variazione percentuale conforme alla polarità della metrica.
              </li>
            )}
            {!isPeriodComparisonActive && pivotTimeDeltaMode === 'none' && !showVarianceDelta && (
              <li style={{ color: '#94a3b8' }}>
                I dati sono proiettati sulle colonne temporali di <strong>{pivotColumns[0]}</strong>. Attiva i toggle sopra per visualizzare colonne delta o badge variazione.
              </li>
            )}
          </ul>
        ) : (
          <div>
            {showVarianceDelta ? (
              <div style={{ color: '#34d399' }}>
                Tabella Flat: i badge di variazione percentuale compaiono sulle metriche che hanno scostamenti o metriche companion (es. <code>delta_*_pct</code>).
              </div>
            ) : (
              <div style={{ color: '#64748b' }}>
                Nessun asse temporale pivot attivo. Clicca sul pulsante <strong>Aggiungi Confronto</strong> sopra per proiettare i periodi e calcolare gli scostamenti.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
