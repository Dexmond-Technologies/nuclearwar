const esbuild = require('esbuild');

// A simple plugin to stub out missing modules
const stubPlugin = {
  name: 'stub',
  setup(build) {
    // Stub missing generated clients
    build.onResolve({ filter: /@\/generated\/client\/.*/ }, args => {
      return { path: args.path, namespace: 'stub-ns' };
    });
    // Stub i18next
    build.onResolve({ filter: /^i18next.*/ }, args => {
      return { path: args.path, namespace: 'stub-ns' };
    });
    // Stub locales
    build.onResolve({ filter: /.*locales\/en\.json$/ }, args => {
      return { path: args.path, namespace: 'stub-ns' };
    });
    
    build.onLoad({ filter: /.*/, namespace: 'stub-ns' }, args => {
      let contents = 'export default {};';
      if (args.path.includes('i18next')) {
         contents = `
           const i18n = { use: () => i18n, init: () => {}, t: (k) => k };
           export default i18n;
         `;
      } else if (args.path.includes('client')) {
         contents = `
           export const MilitaryServiceClient = class { async listMilitaryBases() { return { bases: [], clusters: [], totalInView: 0, truncated: false }; } };
           export const IntelligenceServiceClient = class {};
           export const InfrastructureServiceClient = class {};
         `;
      }
      return { contents, loader: 'js' };
    });
  }
}

esbuild.build({
  entryPoints: ['src/map-entry.ts'],
  bundle: true,
  outfile: 'public/dist/improve_earth.js',
  sourcemap: true,
  minify: true,
  tsconfig: 'tsconfig.json',
  banner: {
    js: 'window.import_meta = { glob: () => ({}), env: { VITE_MAP_INTERACTION_MODE: "flat" } };'
  },
  define: {
    'import.meta': 'window.import_meta',
  },
  plugins: [stubPlugin]
}).then(() => {
  console.log('Map bundle built successfully!');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
