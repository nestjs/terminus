// @ts-check

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const ts = require('gulp-typescript');
const gulp = require('gulp');
const clean = require('gulp-clean');

const { join } = require('path');
const debug = require('gulp-debug');
const { promisify } = require('util');

const exec = promisify(childProcess.exec);

/**
 * SETTINGS
 */
const DIST = join(__dirname, 'dist');
const LIB = join(__dirname, 'lib');
const SAMPLE = join(__dirname, 'sample');

const terminus = ts.createProject(join(__dirname, 'tsconfig.json'));

/**
 * UTIL
 */
function getFolders(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => fs.statSync(path.join(dir, file)).isDirectory());
}

const getDirs = (base) => getFolders(base).map((path) => `${base}/${path}`).filter(p => !p.includes('deprecated'));

/**
 * TASK
 */

gulp.task('clean', () => {
  return gulp
    .src(
      [DIST, SAMPLE + '/*/node_modules/@nestjs/terminus', SAMPLE + '/*/dist'],
      {
        allowEmpty: true,
      },
    )
    .pipe(clean());
});

gulp.task('move:protos', () => {
  return gulp
    .src(join(LIB, './**/*.proto'), { base: LIB })
    .pipe(debug({ title: 'move:protos' }))
    .pipe(gulp.dest(join(DIST)));
});

gulp.task('build', () => {
  return terminus.src().pipe(terminus()).pipe(gulp.dest(DIST));
});

gulp.task('move', () => {
  const directories = getDirs(SAMPLE);

  let stream = gulp.src(['dist/**/*']);

  directories.forEach((dir) => {
    stream = stream.pipe(gulp.dest(dir + '/node_modules/@nestjs/terminus'));
  });
  return stream;
});

gulp.task('install:sample', async () => {
  const directories = getDirs(SAMPLE);

  const promises = directories.map((dir) =>
    exec(`npm install --prefix ${dir}`),
  );

  return await Promise.all(promises);
});

gulp.task('build:sample', async () => {
  const directories = getDirs(SAMPLE);

  const promises = directories.map((dir) =>
    exec(`npm run build --prefix ${dir}`),
  );

  return await Promise.all(promises);
});

/**
 * Aliases
 */
gulp.task('default', gulp.series(['clean', 'build', 'move:protos']));
gulp.task('build:app', gulp.series(['default']));
gulp.task(
  'build:all',
  gulp.series([
    'build:app',
    'install:sample',
    'move',
    'build:sample',
  ]),
);
