// Benchmark della pipeline dati (transformProps) su un dataset sintetico.
// Uso: node scripts/bench.mjs [righe] [periodi]
import { build } from 'esbuild';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rows = Number(process.argv[2] || 50000);
const periods = Number(process.argv[3] || 24);
const outDir = mkdtempSync(join(tmpdir(), 'ht-bench-'));
const outFile = join(outDir, 'transformProps.mjs');

await build({
  entryPoints: [join(root, 'src/plugin/transformProps.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  alias: { '@superset-ui/core': join(root, 'scripts/bench-stub.mjs') },
  logLevel: 'error',
});
const { default: transformProps } = await import(pathToFileURL(outFile).href);

const sedi = 50, reparti = 20, servizi = 20;
let seed = 12345;
const rnd = n => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n);
const data = [];
for (let i = 0; i < rows; i++) {
  const p = i % periods;
  data.push({
    sede: `Sede ${rnd(sedi)}`,
    reparto: `Reparto ${rnd(reparti)}`,
    servizio: `Servizio ${rnd(servizi)}`,
    mese: `2024-${String((p % 12) + 1).padStart(2, '0')}`.concat(p >= 12 ? 'b' : ''),
    richieste_corr: 10 + (i % 90),
    richieste_conf: 8 + (i % 80),
    prime_visite: 3 + (i % 30),
    tempo_attesa_gg: 5 + (i % 40),
  });
}

const formData = {
  hierarchyType: 'multi_dimension',
  groupby: ['sede', 'reparto', 'servizio'],
  columns: ['mese'],
  metrics: ['richieste_corr', 'richieste_conf', 'prime_visite', 'tempo_attesa_gg'],
  showVarianceDelta: true,
  pivotRowTotalsPosition: 'right',
};
const props = { width: 1200, height: 800, formData, rawFormData: formData, queriesData: [{ data }], hooks: {} };

const runs = [];
for (let i = 0; i < 5; i++) {
  const t0 = performance.now();
  const out = transformProps(props);
  runs.push(performance.now() - t0);
  if (i === 0) console.log(`nodi radice: ${out.data.length}, colonne: ${out.columns.length}`);
}
runs.sort((a, b) => a - b);
console.log(`righe=${rows} periodi=${periods} | mediana ${runs[2].toFixed(0)} ms | min ${runs[0].toFixed(0)} ms | max ${runs[4].toFixed(0)} ms`);
rmSync(outDir, { recursive: true, force: true });
