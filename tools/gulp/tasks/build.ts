import { dest, task, series } from 'gulp';
import { distPath, tsconfig } from '../config';
import * as ts from 'gulp-typescript';

function build() {
  const terminus = ts.createProject(tsconfig);
  return terminus.src().pipe(terminus()).pipe(dest(distPath));
}

task('build', build);
task('build:app', series('default'));
