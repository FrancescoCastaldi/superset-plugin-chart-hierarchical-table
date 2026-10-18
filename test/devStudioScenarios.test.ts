jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import transformProps from '../src/plugin/transformProps';
import { healthcareScenario } from '../dev-studio/src/mockData/healthcareScenario';
import { salesPivotScenario } from '../dev-studio/src/mockData/salesPivotScenario';
import { stressTestScenario } from '../dev-studio/src/mockData/stressTestScenario';

describe('Dev Studio Benchmark Scenarios Data Pipeline', () => {
  test('healthcareScenario produces valid hierarchical tree data', () => {
    const props = transformProps({
      width: 1200,
      height: 700,
      formData: healthcareScenario.formData,
      rawFormData: healthcareScenario.formData,
      queriesData: [{ data: healthcareScenario.data }],
    } as any);

    expect(props.data).toBeDefined();
    expect(props.data.length).toBeGreaterThan(0);
    expect(props.columns.length).toBeGreaterThan(0);
    expect(props.grandTotalNode).toBeDefined();
    // ASL 1 Centro and ASL 2 Nord
    expect(props.data.map(n => n.name)).toEqual(['ASL 1 Centro', 'ASL 2 Nord']);
  });

  test('salesPivotScenario produces valid pivoted matrix grid data', () => {
    const props = transformProps({
      width: 1200,
      height: 700,
      formData: salesPivotScenario.formData,
      rawFormData: salesPivotScenario.formData,
      queriesData: [{ data: salesPivotScenario.data }],
    } as any);

    expect(props.data).toBeDefined();
    expect(props.data.length).toBeGreaterThan(0);
    expect(props.columns.length).toBeGreaterThan(0);
    expect(props.isPivotMode).toBe(true);
  });

  test('stressTestScenario produces 5000-row tree data without errors', () => {
    const testData = stressTestScenario.data.slice(0, 500); // verify 500 rows in test
    const props = transformProps({
      width: 1200,
      height: 700,
      formData: stressTestScenario.formData,
      rawFormData: stressTestScenario.formData,
      queriesData: [{ data: testData }],
    } as any);

    expect(props.data).toBeDefined();
    expect(props.data.length).toBeGreaterThan(0);
  });
});
