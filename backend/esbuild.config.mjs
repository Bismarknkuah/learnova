import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

// Bundle the server to a single low-memory CommonJS file. Type-safety is enforced
// separately by `tsc --noEmit` (npm run typecheck). Dependencies stay external and
// load from node_modules at runtime, so native modules (mongoose, bcrypt, etc.) work.
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/index.js',
  packages: 'external',
  external,
  sourcemap: true,
  logLevel: 'info',
});
console.log('✓ Backend bundled to dist/index.js');
