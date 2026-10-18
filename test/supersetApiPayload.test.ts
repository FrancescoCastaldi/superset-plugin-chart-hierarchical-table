import {
  buildChartPostPayload,
  generateCurlCommand,
  generatePythonScript,
  generatePowerShellScript,
} from '../src/utils/supersetApiPayload';

describe('Superset REST API Chart Creation (POST /api/v1/chart/)', () => {
  const sampleFormData = {
    hierarchyType: 'multi_dimension',
    groupby: ['regione', 'asl'],
    columns: ['anno'],
    metrics: ['ricoveri'],
    theme: 'stratum-warm',
  };

  test('buildChartPostPayload creates valid ChartPostSchema structure', () => {
    const payload = buildChartPostPayload(sampleFormData, {
      sliceName: 'Test Chart Sanita',
      datasourceId: 42,
      datasourceType: 'table',
      description: 'Descrizione test',
      dashboardId: 10,
      cacheTimeout: 300,
    });

    expect(payload.slice_name).toBe('Test Chart Sanita');
    expect(payload.datasource_id).toBe(42);
    expect(payload.datasource_type).toBe('table');
    expect(payload.viz_type).toBe('hierarchical_table');
    expect(payload.description).toBe('Descrizione test');
    expect(payload.dashboards).toEqual([10]);
    expect(payload.cache_timeout).toBe(300);

    // Verify params is a valid JSON string
    const parsedParams = JSON.parse(payload.params);
    expect(parsedParams.viz_type).toBe('hierarchical_table');
    expect(parsedParams.datasource).toBe('42__table');
    expect(parsedParams.groupby).toEqual(['regione', 'asl']);
    expect(parsedParams.metrics).toEqual(['ricoveri']);

    // Verify query_context is a valid JSON string
    expect(payload.query_context).toBeDefined();
    const parsedQueryContext = JSON.parse(payload.query_context!);
    expect(parsedQueryContext.datasource).toEqual({ id: 42, type: 'table' });
    expect(parsedQueryContext.queries[0].columns).toEqual(['regione', 'asl', 'anno']);
    expect(parsedQueryContext.queries[0].metrics).toEqual(['ricoveri']);
  });

  test('buildChartPostPayload handles Parent-Child hierarchy correctly', () => {
    const parentChildFormData = {
      hierarchyType: 'parent_child',
      idColumn: 'node_id',
      parentIdColumn: 'parent_id',
      labelColumn: 'node_name',
      metrics: ['valore'],
    };

    const payload = buildChartPostPayload(parentChildFormData, {
      sliceName: 'PC Chart',
      datasourceId: 1,
    });

    const parsedQueryContext = JSON.parse(payload.query_context!);
    expect(parsedQueryContext.queries[0].columns).toEqual(['node_id', 'parent_id', 'node_name']);
    expect(parsedQueryContext.queries[0].metrics).toEqual(['valore']);
  });

  test('generateCurlCommand includes authentication, CSRF, and POST endpoint', () => {
    const payload = buildChartPostPayload(sampleFormData, {
      sliceName: 'cURL Chart',
      datasourceId: 1,
    });

    const curl = generateCurlCommand(payload, 'http://localhost:8088', 'admin', 'secret123');
    expect(curl).toContain('http://localhost:8088/api/v1/security/login');
    expect(curl).toContain('http://localhost:8088/api/v1/security/csrf_token/');
    expect(curl).toContain('http://localhost:8088/api/v1/chart/');
    expect(curl).toContain('-H "Authorization: Bearer $ACCESS_TOKEN"');
    expect(curl).toContain('-H "X-CSRFToken: $CSRF_TOKEN"');
  });

  test('generatePythonScript includes requests session, login, and chart creation', () => {
    const payload = buildChartPostPayload(sampleFormData, {
      sliceName: 'Python Chart',
      datasourceId: 1,
    });

    const script = generatePythonScript(payload, 'http://192.168.9.42:8088', 'admin');
    expect(script).toContain('import requests');
    expect(script).toContain('SUPERSET_URL = "http://192.168.9.42:8088"');
    expect(script).toContain('f"{SUPERSET_URL}/api/v1/security/login"');
    expect(script).toContain('f"{SUPERSET_URL}/api/v1/chart/"');
    expect(script).toContain('session.headers.update({"Authorization": f"Bearer {token}"})');
  });

  test('generatePowerShellScript includes Invoke-RestMethod and correct headers', () => {
    const payload = buildChartPostPayload(sampleFormData, {
      sliceName: 'PowerShell Chart',
      datasourceId: 1,
    });

    const ps = generatePowerShellScript(payload, 'http://localhost:8088', 'admin');
    expect(ps).toContain('Invoke-RestMethod');
    expect(ps).toContain('http://localhost:8088/api/v1/security/login');
    expect(ps).toContain('http://localhost:8088/api/v1/chart/');
  });
});
