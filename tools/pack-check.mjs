/**
 * Packs the package, installs the tarball into a throwaway directory and
 * imports it from real Node - as ESM and, through `require(esm)`, as CJS.
 *
 * A tarball rather than `dist/` on purpose: the two failure modes worth
 * catching, an `.npmignore` mistake and the proto copy step not running, are
 * both invisible to an import out of the source tree.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

const dir = mkdtempSync(join(tmpdir(), 'terminus-pack-'));
console.log(`Packing into ${dir}`);

run('npm', ['pack', '--ignore-scripts', '--pack-destination', dir], process.cwd());
const tarball = readdirSync(dir).find((f) => f.endsWith('.tgz'));
if (!tarball) {
  throw new Error('npm pack produced no tarball');
}

writeFileSync(
  join(dir, 'package.json'),
  JSON.stringify({ name: 'terminus-pack-check', private: true, version: '1.0.0' }),
);
run('npm', ['install', '--no-audit', '--no-fund', join(dir, tarball)], dir);

const installed = join(dir, 'node_modules', '@nestjs', 'terminus');

// Both module systems must reach the same exports.
run('node', ['--input-type=module', '-e', `
  import { TerminusModule, HealthCheckService } from '@nestjs/terminus';
  if (!TerminusModule || !HealthCheckService) throw new Error('missing export (esm)');
`], dir);
run('node', ['--input-type=commonjs', '-e', `
  const t = require('@nestjs/terminus');
  if (!t.TerminusModule || !t.HealthCheckService) throw new Error('missing export (cjs)');
`], dir);

// The gRPC indicator reads this at check time, and only the build's copy step
// puts it in the tarball.
const proto = join(installed, 'dist/health-indicator/microservice/protos/health.proto');
if (!existsSync(proto)) {
  throw new Error(`health.proto is missing from the tarball: ${proto}`);
}

console.log('Packaging check passed');
