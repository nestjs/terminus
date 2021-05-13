import { dest, src, task } from 'gulp';
import { join } from 'path';
import { samplePath, libPath, distPath } from '../config';
import { getDirs } from '../util/task-helpers';

/**
 * Moves the compiled nest files into the `samples/*` dirs.
 */
function move() {
  const samplesDirs = getDirs(samplePath);
  const distFiles = src(['./dist/**/*']);

  return samplesDirs.reduce(
    (distFile, dir) => distFile.pipe(dest(join(dir, '/node_modules/@nestjs/terminus'))),
    distFiles,
  );
}

task('move', move);
task('move:protos', () => {
  return src(join(libPath, './**/*.proto'), { base: libPath })
    .pipe(dest(join(distPath)));
});
