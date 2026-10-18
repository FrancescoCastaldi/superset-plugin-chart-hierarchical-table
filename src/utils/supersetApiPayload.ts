/**
 * Superset REST API Helper: Create a New Chart (POST /api/v1/chart/)
 * Reference: https://superset.apache.org/developer-docs/api/create-a-new-chart/
 * Schema: ChartPostSchema
 * Author: Francesco Castaldi
 */

export interface ChartPostPayloadOptions {
  sliceName: string;
  datasourceId: number;
  datasourceType?: 'table' | 'dataset' | 'query';
  description?: string;
  dashboardId?: number;
  cacheTimeout?: number;
}

export interface ChartPostPayload {
  slice_name: string;
  datasource_id: number;
  datasource_type: string;
  viz_type: string;
  description?: string;
  params: string;
  query_context?: string;
  dashboards?: number[];
  cache_timeout?: number;
}

/**
 * Builds the canonical ChartPostSchema payload accepted by POST /api/v1/chart/
 */
export function buildChartPostPayload(
  formData: Record<string, any>,
  options: ChartPostPayloadOptions
): ChartPostPayload {
  const {
    sliceName,
    datasourceId,
    datasourceType = 'table',
    description = 'Hierarchical Table Chart generated via StratumTree Dev Studio',
    dashboardId,
    cacheTimeout,
  } = options;

  // Prepare normalized formData params
  const normalizedFormData: Record<string, any> = {
    ...formData,
    viz_type: 'hierarchical_table',
    datasource: `${datasourceId}__${datasourceType}`,
  };

  // Determine query columns based on hierarchy mode
  const hierarchyType = formData.hierarchyType || 'multi_dimension';
  let columns: string[] = [];

  if (hierarchyType === 'multi_dimension') {
    const rowDims = Array.isArray(formData.groupby)
      ? formData.groupby
      : Array.isArray(formData.hierarchyDimensions)
      ? formData.hierarchyDimensions
      : Array.isArray(formData.hierarchy_dimensions)
      ? formData.hierarchy_dimensions
      : [];
    const pivotDims = Array.isArray(formData.columns)
      ? formData.columns
      : Array.isArray(formData.pivot_columns)
      ? formData.pivot_columns
      : [];
    columns = Array.from(new Set([...rowDims, ...pivotDims]));
  } else {
    columns = [formData.idColumn, formData.parentIdColumn, formData.labelColumn].filter(Boolean);
  }

  const metrics = Array.isArray(formData.metrics) ? formData.metrics : [];

  // Construct query_context JSON structure
  const queryContextObj = {
    datasource: {
      id: datasourceId,
      type: datasourceType,
    },
    force: false,
    queries: [
      {
        columns,
        metrics,
        filters: [],
        order_desc: true,
      },
    ],
    result_format: 'json',
    result_type: 'full',
  };

  const payload: ChartPostPayload = {
    slice_name: sliceName,
    datasource_id: datasourceId,
    datasource_type: datasourceType,
    viz_type: 'hierarchical_table',
    description,
    params: JSON.stringify(normalizedFormData),
    query_context: JSON.stringify(queryContextObj),
  };

  if (dashboardId && Number.isInteger(dashboardId) && dashboardId > 0) {
    payload.dashboards = [dashboardId];
  }

  if (typeof cacheTimeout === 'number' && cacheTimeout > 0) {
    payload.cache_timeout = cacheTimeout;
  }

  return payload;
}

/**
 * Generates an executable cURL command sequence (login + post chart)
 */
export function generateCurlCommand(
  payload: ChartPostPayload,
  supersetUrl: string,
  username = 'admin',
  password = 'YOUR_PASSWORD'
): string {
  const cleanUrl = supersetUrl.replace(/\/+$/, '');
  const jsonPayload = JSON.stringify(payload, null, 2);

  return `# 1. Autenticazione e recupero JWT Access Token
ACCESS_TOKEN=$(curl -s -X POST "${cleanUrl}/api/v1/security/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "${username}", "password": "${password}", "provider": "db", "refresh": true}' | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# 2. Recupero CSRF Token (necessario per installazioni Superset con CSRF attivo)
CSRF_TOKEN=$(curl -s -X GET "${cleanUrl}/api/v1/security/csrf_token/" \\
  -H "Authorization: Bearer $ACCESS_TOKEN" | grep -o '"result":"[^"]*' | cut -d'"' -f4)

# 3. Creazione del nuovo chart tramite POST /api/v1/chart/
curl -X POST "${cleanUrl}/api/v1/chart/" \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "X-CSRFToken: $CSRF_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${jsonPayload.replace(/'/g, "'\\''")}'
`;
}

/**
 * Generates an executable Python script using requests
 */
export function generatePythonScript(
  payload: ChartPostPayload,
  supersetUrl: string,
  username = 'admin'
): string {
  const cleanUrl = supersetUrl.replace(/\/+$/, '');
  const jsonPayload = JSON.stringify(payload, null, 4);

  return `import requests
import json

SUPERSET_URL = "${cleanUrl}"
USERNAME = "${username}"
PASSWORD = "YOUR_PASSWORD"  # Inserire la password dell'utente

session = requests.Session()

# 1. Login per ottenere access_token
login_resp = session.post(
    f"{SUPERSET_URL}/api/v1/security/login",
    json={"username": USERNAME, "password": PASSWORD, "provider": "db", "refresh": True},
    timeout=10,
)
login_resp.raise_for_status()
token = login_resp.json().get("access_token")
session.headers.update({"Authorization": f"Bearer {token}"})

# 2. Recupero del CSRF token
csrf_resp = session.get(f"{SUPERSET_URL}/api/v1/security/csrf_token/", timeout=10)
if csrf_resp.ok:
    csrf_token = csrf_resp.json().get("result")
    session.headers.update({"X-CSRFToken": csrf_token})

# 3. Creazione del chart tramite POST /api/v1/chart/
payload = ${jsonPayload}

resp = session.post(f"{SUPERSET_URL}/api/v1/chart/", json=payload, timeout=15)
if resp.status_code == 201:
    chart_id = resp.json().get("id")
    print(f"Chart creato con successo! ID: {chart_id}")
    print(f"Esplora su Superset: {SUPERSET_URL}/explore/?slice_id={chart_id}")
else:
    print(f"Errore nella creazione: {resp.status_code} - {resp.text}")
`;
}

/**
 * Generates an executable PowerShell script
 */
export function generatePowerShellScript(
  payload: ChartPostPayload,
  supersetUrl: string,
  username = 'admin'
): string {
  const cleanUrl = supersetUrl.replace(/\/+$/, '');
  const jsonPayload = JSON.stringify(payload, null, 2);

  return `# 1. Autenticazione e recupero JWT Token
$LoginBody = @{
    username = "${username}"
    password = "YOUR_PASSWORD"
    provider = "db"
    refresh = $true
} | ConvertTo-Json

$LoginResponse = Invoke-RestMethod -Uri "${cleanUrl}/api/v1/security/login" -Method Post -ContentType "application/json" -Body $LoginBody
$AccessToken = $LoginResponse.access_token

$Headers = @{
    "Authorization" = "Bearer $AccessToken"
}

# 2. Recupero del CSRF Token
try {
    $CsrfResponse = Invoke-RestMethod -Uri "${cleanUrl}/api/v1/security/csrf_token/" -Method Get -Headers $Headers
    if ($CsrfResponse.result) {
        $Headers["X-CSRFToken"] = $CsrfResponse.result
    }
} catch {
    Write-Host "CSRF Token non richiesto o bypassato."
}

# 3. Creazione del chart tramite POST /api/v1/chart/
$ChartPayload = @'
${jsonPayload}
'@

$CreateResponse = Invoke-RestMethod -Uri "${cleanUrl}/api/v1/chart/" -Method Post -Headers $Headers -ContentType "application/json" -Body $ChartPayload
Write-Host "Chart creato con successo! ID:" $CreateResponse.id
Write-Host "URL Esplora: ${cleanUrl}/explore/?slice_id=$($CreateResponse.id)"
`;
}
