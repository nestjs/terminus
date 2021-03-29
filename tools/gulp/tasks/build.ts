import { dest, src, task, series } from 'gulp';
import { join } from 'path';
import { distPath } from '../config';
import * as ts from 'gulp-typescript';

/**
 * Moves the compiled nest files into the `samples/*` dirs.
 */
function build() {
  const terminus = ts.createProject(join(__dirname, 'tsconfig.json'));

  return src().pipe(terminus()).pipe(dest(distPath));
}

task('build', build);
task('build:app', series('default'));
