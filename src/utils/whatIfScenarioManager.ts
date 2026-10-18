import { WhatIfScenario } from '../types';

export interface ScenarioManagerOptions {
  maxScenarios?: number;
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'stratumtree_whatif_scenarios';
const DEFAULT_MAX_SCENARIOS = 10;

export interface WhatIfScenarioManager {
  save: (scenario: WhatIfScenario) => void;
  load: (id: string) => WhatIfScenario | undefined;
  list: () => WhatIfScenario[];
  remove: (id: string) => void;
  rename: (id: string, newName: string) => void;
  clear: () => void;
}

/**
 * Creates a scenario manager that persists What-If scenarios in sessionStorage
 * with an automatic in-memory fallback for non-browser or sandbox environments.
 */
export function createScenarioManager(
  opts: ScenarioManagerOptions = {},
): WhatIfScenarioManager {
  const maxScenarios = opts.maxScenarios ?? DEFAULT_MAX_SCENARIOS;
  const storageKey = opts.storageKey ?? DEFAULT_STORAGE_KEY;

  let inMemoryScenarios: WhatIfScenario[] = [];

  function isStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
        return false;
      }
      const testKey = '__stratum_storage_test__';
      window.sessionStorage.setItem(testKey, '1');
      window.sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  const hasStorage = isStorageAvailable();

  function readScenarios(): WhatIfScenario[] {
    if (!hasStorage) {
      return [...inMemoryScenarios];
    }
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }

  function writeScenarios(scenarios: WhatIfScenario[]): void {
    if (!hasStorage) {
      inMemoryScenarios = [...scenarios];
      return;
    }
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(scenarios));
    } catch {
      inMemoryScenarios = [...scenarios];
    }
  }

  return {
    list(): WhatIfScenario[] {
      return readScenarios();
    },

    load(id: string): WhatIfScenario | undefined {
      const list = readScenarios();
      return list.find(s => s.id === id);
    },

    save(scenario: WhatIfScenario): void {
      const list = readScenarios();
      const existingIdx = list.findIndex(s => s.id === scenario.id);

      let updated: WhatIfScenario[];
      if (existingIdx >= 0) {
        updated = [...list];
        updated[existingIdx] = { ...scenario };
      } else {
        updated = [scenario, ...list];
        if (updated.length > maxScenarios) {
          updated = updated.slice(0, maxScenarios);
        }
      }

      writeScenarios(updated);
    },

    remove(id: string): void {
      const list = readScenarios();
      const filtered = list.filter(s => s.id !== id);
      writeScenarios(filtered);
    },

    rename(id: string, newName: string): void {
      const list = readScenarios();
      const target = list.find(s => s.id === id);
      if (target) {
        target.name = newName;
        writeScenarios(list);
      }
    },

    clear(): void {
      if (hasStorage) {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // ignore storage clearing error
        }
      }
      inMemoryScenarios = [];
    },
  };
}
