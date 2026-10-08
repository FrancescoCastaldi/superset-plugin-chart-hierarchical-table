import { readFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';

// Stylesheets are injected at runtime so the single ESM bundle stays self-contained
// (esbuild would otherwise emit a sibling .css file that nothing imports).
const injectCss = {
  name: 'inject-css',
  setup(pluginBuild) {
    pluginBuild.onLoad({ filter: /\.css$/ }, async ({ path }) => {
      const { code } = await transform(await readFile(path, 'utf8'), {
        loader: 'css',
        minify: true,
      });
      return {
        loader: 'js',
        contents:
          `const css = ${JSON.stringify(code)};\n` +
          "if (typeof document !== 'undefined') {\n" +
          "  const style = document.createElement('style');\n" +
          '  style.textContent = css;\n' +
          '  document.head.appendChild(style);\n' +
          '}\n',
      };
    });
  },
};

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  target: ['es2020', 'chrome110', 'firefox110', 'safari16'],
  minify: true,
  sourcemap: 'linked',
  // src/ ships with the package, so the map resolves sources without embedding them.
  sourcesContent: false,
  outfile: 'dist/index.esm.js',
  external: [
    'react',
    'react-dom',
    '@superset-ui/core',
    '@superset-ui/chart-controls',
    'echarts/core',
    'echarts/charts',
    'echarts/components',
    'echarts/renderers',
  ],
  loader: { '.png': 'dataurl', '.svg': 'dataurl' },
  plugins: [injectCss],
  logLevel: 'info',
});
