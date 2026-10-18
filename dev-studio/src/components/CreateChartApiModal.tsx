import React, { useState, useMemo } from 'react';
import {
  buildChartPostPayload,
  generateCurlCommand,
  generatePythonScript,
  generatePowerShellScript,
} from '../utils/supersetApiPayload';

interface CreateChartApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: Record<string, any>;
  scenarioName: string;
}

export const CreateChartApiModal: React.FC<CreateChartApiModalProps> = ({
  isOpen,
  onClose,
  formData,
  scenarioName,
}) => {
  const [supersetUrl, setSupersetUrl] = useState('http://localhost:8088');
  const [sliceName, setSliceName] = useState(`StratumTree - ${scenarioName}`);
  const [datasourceId, setDatasourceId] = useState(1);
  const [datasourceType, setDatasourceType] = useState<'table' | 'dataset' | 'query'>('table');
  const [dashboardIdStr, setDashboardIdStr] = useState('');
  const [activeTab, setActiveTab] = useState<'json' | 'scripts' | 'live'>('json');
  const [scriptType, setScriptType] = useState<'curl' | 'python' | 'powershell'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live call state
  const [authMode, setAuthMode] = useState<'credentials' | 'token'>('credentials');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [bearerToken, setBearerToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResult, setApiResult] = useState<{ ok: boolean; status?: number; data?: any; error?: string } | null>(null);

  // Protected dashboards warning
  const dashboardIdNum = parseInt(dashboardIdStr, 10);
  const isProtectedDashboard = [2, 3, 4, 5].includes(dashboardIdNum);

  // Build the payload
  const payload = useMemo(() => {
    return buildChartPostPayload(formData, {
      sliceName: sliceName.trim() || `StratumTree - ${scenarioName}`,
      datasourceId: Number(datasourceId) || 1,
      datasourceType,
      dashboardId: !isNaN(dashboardIdNum) && dashboardIdNum > 0 ? dashboardIdNum : undefined,
    });
  }, [formData, sliceName, scenarioName, datasourceId, datasourceType, dashboardIdNum]);

  // Scripts
  const curlCmd = useMemo(() => generateCurlCommand(payload, supersetUrl, username, password), [payload, supersetUrl, username, password]);
  const pythonScript = useMemo(() => generatePythonScript(payload, supersetUrl, username), [payload, supersetUrl, username]);
  const psScript = useMemo(() => generatePowerShellScript(payload, supersetUrl, username), [payload, supersetUrl, username]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLiveSubmit = async () => {
    setIsSubmitting(true);
    setApiResult(null);

    const cleanUrl = supersetUrl.replace(/\/+$/, '');

    try {
      let token = bearerToken.trim();
      let csrfToken = '';

      // 1. Authenticate if using credentials
      if (authMode === 'credentials') {
        const loginRes = await fetch(`${cleanUrl}/api/v1/security/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            provider: 'db',
            refresh: true,
          }),
        });

        if (!loginRes.ok) {
          const errText = await loginRes.text();
          throw new Error(`Login fallito (${loginRes.status}): ${errText}`);
        }

        const loginData = await loginRes.json();
        token = loginData.access_token;
      }

      // 2. Fetch CSRF token
      if (token) {
        try {
          const csrfRes = await fetch(`${cleanUrl}/api/v1/security/csrf_token/`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (csrfRes.ok) {
            const csrfData = await csrfRes.json();
            csrfToken = csrfData.result || '';
          }
        } catch {
          // CSRF endpoint might not be required
        }
      }

      // 3. Post to /api/v1/chart/
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (csrfToken) headers['X-CSRFToken'] = csrfToken;

      const chartRes = await fetch(`${cleanUrl}/api/v1/chart/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const resData = await chartRes.json();

      if (chartRes.status === 201) {
        setApiResult({
          ok: true,
          status: chartRes.status,
          data: resData,
        });
      } else {
        setApiResult({
          ok: false,
          status: chartRes.status,
          error: resData.message || JSON.stringify(resData),
        });
      }
    } catch (err: any) {
      setApiResult({
        ok: false,
        error: err?.message || String(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="api-modal-overlay" onClick={onClose}>
      <div className="api-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="api-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🌐</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-color)' }}>
                Integrazione Superset REST API: POST /api/v1/chart/
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Genera ed esegue il payload conforme a <code>ChartPostSchema</code> di Apache Superset
              </p>
            </div>
          </div>
          <button type="button" className="api-modal-close" onClick={onClose} title="Chiudi">
            ✕
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="api-config-grid">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Superset Base URL</label>
            <input
              type="text"
              className="form-input"
              value={supersetUrl}
              onChange={(e) => setSupersetUrl(e.target.value)}
              placeholder="http://localhost:8088"
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nome Chart (slice_name)</label>
            <input
              type="text"
              className="form-input"
              value={sliceName}
              onChange={(e) => setSliceName(e.target.value)}
              placeholder="Nome del chart"
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Dataset ID (datasource_id)</label>
            <input
              type="number"
              className="form-input"
              min={1}
              value={datasourceId}
              onChange={(e) => setDatasourceId(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tipo Datasource</label>
            <select
              className="form-select"
              value={datasourceType}
              onChange={(e) => setDatasourceType(e.target.value as any)}
            >
              <option value="table">table</option>
              <option value="dataset">dataset</option>
              <option value="query">query</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Dashboard ID (opzionale)</label>
            <input
              type="number"
              className="form-input"
              value={dashboardIdStr}
              onChange={(e) => setDashboardIdStr(e.target.value)}
              placeholder="Es. 10"
            />
          </div>
        </div>

        {isProtectedDashboard && (
          <div
            style={{
              margin: '8px 16px 0 16px',
              padding: '8px 12px',
              background: '#3d1d1d',
              border: '1px solid #cf222e',
              borderRadius: '6px',
              color: '#ff8182',
              fontSize: '11px',
            }}
          >
            ⚠️ <strong>Attenzione di Sicurezza:</strong> Gli ID 2, 3, 4, 5 corrispondono a dashboard protette/benchmark aziendali. Inserire un ID dashboard dedicato al progetto.
          </div>
        )}

        {/* Tab Navigator */}
        <div className="api-tab-nav">
          <button
            type="button"
            className={`api-tab-btn ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            📄 Payload JSON (ChartPostSchema)
          </button>
          <button
            type="button"
            className={`api-tab-btn ${activeTab === 'scripts' ? 'active' : ''}`}
            onClick={() => setActiveTab('scripts')}
          >
            💻 Script CLI (cURL / Python / PowerShell)
          </button>
          <button
            type="button"
            className={`api-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            🚀 Chiamata Diretta (REST Client)
          </button>
        </div>

        {/* Body Content by Tab */}
        <div className="api-modal-body">
          {activeTab === 'json' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Payload JSON valido per <code>POST {supersetUrl}/api/v1/chart/</code>:
                </span>
                <button
                  type="button"
                  className="btn-pill primary"
                  onClick={() => handleCopy(JSON.stringify(payload, null, 2), 'payload_json')}
                >
                  {copiedKey === 'payload_json' ? '✓ Copiato!' : '📋 Copia Payload JSON'}
                </button>
              </div>
              <pre className="code-preview-box">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'scripts' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn-pill ${scriptType === 'curl' ? 'primary' : ''}`}
                    onClick={() => setScriptType('curl')}
                  >
                    cURL (Bash)
                  </button>
                  <button
                    type="button"
                    className={`btn-pill ${scriptType === 'python' ? 'primary' : ''}`}
                    onClick={() => setScriptType('python')}
                  >
                    Python (requests)
                  </button>
                  <button
                    type="button"
                    className={`btn-pill ${scriptType === 'powershell' ? 'primary' : ''}`}
                    onClick={() => setScriptType('powershell')}
                  >
                    PowerShell
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-pill primary"
                  onClick={() => {
                    const text = scriptType === 'curl' ? curlCmd : scriptType === 'python' ? pythonScript : psScript;
                    handleCopy(text, `script_${scriptType}`);
                  }}
                >
                  {copiedKey === `script_${scriptType}` ? '✓ Copiato!' : '📋 Copia Script'}
                </button>
              </div>

              <pre className="code-preview-box">
                {scriptType === 'curl' ? curlCmd : scriptType === 'python' ? pythonScript : psScript}
              </pre>
            </div>
          )}

          {activeTab === 'live' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="authMode"
                    checked={authMode === 'credentials'}
                    onChange={() => setAuthMode('credentials')}
                  />
                  Credenziali Utente (Login automatico)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="authMode"
                    checked={authMode === 'token'}
                    onChange={() => setAuthMode('token')}
                  />
                  Bearer Access Token Diretto
                </label>
              </div>

              {authMode === 'credentials' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Username Superset</label>
                    <input
                      type="text"
                      className="form-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">JWT Access Token</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                </div>
              )}

              <div>
                <button
                  type="button"
                  className="btn-pill primary"
                  disabled={isSubmitting}
                  onClick={handleLiveSubmit}
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  {isSubmitting ? 'Invio in corso...' : '🚀 Invia POST /api/v1/chart/ a Superset'}
                </button>
              </div>

              {/* Result Area */}
              {apiResult && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: apiResult.ok ? '#1b3a24' : '#3d1d1d',
                    border: `1px solid ${apiResult.ok ? '#2ea043' : '#cf222e'}`,
                    fontSize: '12px',
                  }}
                >
                  {apiResult.ok ? (
                    <div>
                      <div style={{ fontWeight: 600, color: '#3fb950', marginBottom: '6px' }}>
                        ✓ Chart creato con successo su Apache Superset! (HTTP {apiResult.status})
                      </div>
                      <div>ID Chart: <strong>{apiResult.data?.id}</strong></div>
                      <div style={{ marginTop: '8px' }}>
                        <a
                          href={`${supersetUrl.replace(/\/+$/, '')}/explore/?slice_id=${apiResult.data?.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#58a6ff',
                            textDecoration: 'underline',
                            fontWeight: 500,
                          }}
                        >
                          🔗 Apri subito il Chart in Superset Explore →
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, color: '#ff8182', marginBottom: '4px' }}>
                        ✕ Errore nella chiamata API (HTTP {apiResult.status || 'Client/Network'}):
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#ff8182' }}>
                        {apiResult.error}
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Nota: Se la richiesta fallisce con errore CORS dal browser, utilizza la scheda <strong>Script CLI</strong> (cURL o Python) oppure abilita CORS in <code>superset_config.py</code>.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
