import { task, src, series } from 'gulp';
import { libPath } from '../config';
import * as clean from 'gulp-clean';
import * as deleteEmpty from 'delete-empty';

/**
 * Cleans the build output assets from the packages folders
 */
function cleanOutput() {
  return src(
    [
      `${libPath}/**/*.js`,
      `${libPath}/**/*.d.ts`,
      `${libPath}/**/*.js.map`,
      `${libPath}/**/*.d.ts.map`,
    ],
    {
      read: false,
    },
  ).pipe(clean());
}

/**
 * Cleans empty dirs
 */
function cleanDirs(done: () => void) {
  deleteEmpty.sync(`${libPath}/`);
  done();
}

task('clean:output', cleanOutput);
task('clean:dirs', cleanDirs);
task('clean:bundle', series('clean:output', 'clean:dirs'));
task('default', series('clean:output', 'clean:dirs'));
