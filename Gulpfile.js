const ts = require('gulp-typescript');
const gulp = require('gulp');
const clean = require('gulp-clean');

const { join } = require('path');

const DIST = join(__dirname, 'dist');
const LIB = join(__dirname, 'lib');

const terminus = ts.createProject(join(__dirname, 'tsconfig.json'));

gulp.task('clean', () => {
  return gulp.src(DIST).pipe(clean())
});

gulp.task('move', () => {
  return gulp
    .src(join(LIB, './**/*.proto'), { base: LIB })
    .pipe(gulp.dest(join(DIST)));
});

gulp.task('build', () => {
  return terminus
    .src()
    .pipe(terminus())
    .pipe(gulp.dest(DIST));
});

gulp.task('default', gulp.series(['clean', 'build', 'move']));
