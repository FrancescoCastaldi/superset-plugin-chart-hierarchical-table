import { healthcareScenario } from './healthcareScenario';
import { salesPivotScenario } from './salesPivotScenario';
import { stressTestScenario } from './stressTestScenario';

export const ALL_SCENARIOS = [
  healthcareScenario,
  salesPivotScenario,
  stressTestScenario,
];

export function getScenarioById(id: string) {
  return ALL_SCENARIOS.find((s) => s.id === id) || healthcareScenario;
}
