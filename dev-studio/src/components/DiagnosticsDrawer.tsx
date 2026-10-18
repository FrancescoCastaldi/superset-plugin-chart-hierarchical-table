import React, { useState } from 'react';

export interface LogEntry {
  id: string;
  time: string;
  type: 'filter' | 'context_menu' | 'sort' | 'expand' | 'perf' | 'reorder';
  message: string;
  payload?: any;
}

interface DiagnosticsDrawerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  execTimeMs: number;
  nodeCount: number;
  activeFilterCount: number;
}

export const DiagnosticsDrawer: React.FC<DiagnosticsDrawerProps> = ({
  logs,
  onClearLogs,
  execTimeMs,
  nodeCount,
  activeFilterCount,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="diagnostics-drawer" style={{ height: isCollapsed ? '36px' : '180px' }}>
      <div className="drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>⚡ Live Diagnostics & Event Monitor</span>
          <span style={{ color: '#58a6ff' }}>Pipeline: {execTimeMs.toFixed(1)} ms</span>
          <span style={{ color: '#7ee787' }}>Nodes: {nodeCount}</span>
          <span style={{ color: '#d29922' }}>Filters: {activeFilterCount}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-pill"
            style={{ fontSize: '10px', padding: '2px 8px' }}
            onClick={onClearLogs}
          >
            Clear Logs
          </button>
          <button
            type="button"
            className="btn-pill"
            style={{ fontSize: '10px', padding: '2px 8px' }}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? 'Expand ▲' : 'Minimize ▼'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="drawer-logs">
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>
              Nessun evento registrato. Clicca su una cella per testare il cross-filtering (setDataMask), espandi un nodo o fai click destro per il context menu.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="log-entry">
                <span className="log-time">[{log.time}]</span>
                <span className="log-event">{log.type.toUpperCase()}:</span>
                <span>{log.message}</span>
                {log.payload && (
                  <span className="log-payload">
                    {typeof log.payload === 'object' ? JSON.stringify(log.payload) : String(log.payload)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
