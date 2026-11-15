/**
 * Bundles a small Nest app together with Terminus and its dependencies, and
 * runs the bundle where no `node_modules` folder can be reached.
 *
 * Two things broke bundled apps before and are invisible to the unit tests:
 * - asking Node whether an optional peer is on disk. In a bundle it is not.
 * - reading `import.meta.url` at module load. It is not set in a CommonJS
 *   bundle.
 *
 * esbuild covers both: its ESM output keeps `import.meta` as it is, its
 * CommonJS output replaces it with an empty object.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const entry = join(import.meta.dirname, 'bundle-check/app.mjs');
const { peerDependenciesMeta } = JSON.parse(readFileSync('package.json', 'utf8'));

// The app only uses `@nestjs/axios`. The other optional peers stay external,
// the way an app has to mark the peers it has not installed.
const unusedPeers = Object.keys(peerDependenciesMeta).filter(
  (name) => name !== '@nestjs/axios',
);

/** Keeps optional packages of Nest that are not installed as runtime imports. */
const notInstalledAsExternal = {
  name: 'not-installed-as-external',
  setup(esbuild) {
    esbuild.onResolve({ filter: /^[^./]/ }, ({ path, resolveDir }) => {
      try {
        createRequire(join(resolveDir, 'index.js')).resolve(path);
        return null;
      } catch (error) {
        return error.code === 'MODULE_NOT_FOUND' ? { path, external: true } : null;
      }
    });
  },
};

// CommonJS dependencies call `require` for Node built-ins, which an ES module
// does not have.
const requireShim =
  "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);";

for (const format of ['esm', 'cjs']) {
  const dir = mkdtempSync(join(tmpdir(), `terminus-bundle-${format}-`));
  const outfile = join(dir, format === 'esm' ? 'main.mjs' : 'main.cjs');

  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format,
    external: unusedPeers,
    plugins: [notInstalledAsExternal],
    banner: format === 'esm' ? { js: requireShim } : {},
    logLevel: 'error',
  });

  const output = execFileSync('node', [outfile], { cwd: dir, encoding: 'utf8' });
  console.log(`${format}: ${output.trim()}`);
}

console.log('Bundle check passed');
