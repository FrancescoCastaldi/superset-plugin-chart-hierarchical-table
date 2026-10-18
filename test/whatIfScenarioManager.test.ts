import { createScenarioManager } from '../src/utils/whatIfScenarioManager';
import { WhatIfScenario } from '../src/types';

describe('whatIfScenarioManager', () => {
  it('saves, loads, and lists scenarios in memory or session storage', () => {
    const manager = createScenarioManager({ storageKey: 'test_scenarios_1' });
    manager.clear();

    const scenario1: WhatIfScenario = {
      id: 'scen-1',
      name: 'Scenario Ottimistico +10%',
      adjustments: [{ metric: 'sales', factor: 1.10 }],
      createdAt: 1000,
    };

    manager.save(scenario1);

    expect(manager.list().length).toBe(1);
    expect(manager.load('scen-1')).toEqual(scenario1);
    expect(manager.load('non-existent')).toBeUndefined();
  });

  it('updates an existing scenario when saved with the same id', () => {
    const manager = createScenarioManager({ storageKey: 'test_scenarios_2' });
    manager.clear();

    const scenario: WhatIfScenario = {
      id: 'scen-update',
      name: 'V1',
      adjustments: [{ metric: 'cost', factor: 1.05 }],
      createdAt: 1000,
    };
    manager.save(scenario);

    const updated: WhatIfScenario = {
      ...scenario,
      name: 'V2 Updated',
      adjustments: [{ metric: 'cost', factor: 1.20 }],
    };
    manager.save(updated);

    const list = manager.list();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('V2 Updated');
    expect(list[0].adjustments[0].factor).toBe(1.20);
  });

  it('removes a scenario by id', () => {
    const manager = createScenarioManager({ storageKey: 'test_scenarios_3' });
    manager.clear();

    manager.save({ id: 's1', name: 'S1', adjustments: [], createdAt: 1 });
    manager.save({ id: 's2', name: 'S2', adjustments: [], createdAt: 2 });
    expect(manager.list().length).toBe(2);

    manager.remove('s1');
    const list = manager.list();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('s2');
  });

  it('renames a scenario', () => {
    const manager = createScenarioManager({ storageKey: 'test_scenarios_4' });
    manager.clear();

    manager.save({ id: 's1', name: 'Original Name', adjustments: [], createdAt: 1 });
    manager.rename('s1', 'New Brand Name');

    expect(manager.load('s1')!.name).toBe('New Brand Name');
  });

  it('clears all scenarios', () => {
    const manager = createScenarioManager({ storageKey: 'test_scenarios_5' });
    manager.save({ id: 's1', name: 'S1', adjustments: [], createdAt: 1 });
    manager.save({ id: 's2', name: 'S2', adjustments: [], createdAt: 2 });
    expect(manager.list().length).toBe(2);

    manager.clear();
    expect(manager.list().length).toBe(0);
  });

  it('enforces maximum scenario count with FIFO truncation', () => {
    const manager = createScenarioManager({ maxScenarios: 3, storageKey: 'test_scenarios_limit' });
    manager.clear();

    manager.save({ id: 's1', name: 'S1', adjustments: [], createdAt: 1 });
    manager.save({ id: 's2', name: 'S2', adjustments: [], createdAt: 2 });
    manager.save({ id: 's3', name: 'S3', adjustments: [], createdAt: 3 });
    manager.save({ id: 's4', name: 'S4', adjustments: [], createdAt: 4 });

    const list = manager.list();
    expect(list.length).toBe(3);
    // Most recent is s4, s3, s2; oldest s1 was dropped
    expect(list.map(s => s.id)).toEqual(['s4', 's3', 's2']);
  });
});
