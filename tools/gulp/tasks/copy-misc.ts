import { task, src, dest } from 'gulp';
import { libPaths } from '../config';

/**
 * Copies assets like README.md or LICENSE from the project base path
 * to all the packages.
 */
function copyMisc(): NodeJS.ReadWriteStream {
  const miscFiles = src(['README.md', 'LICENSE', '.npmignore']);
  // Since `dest()` does not take a string-array, we have to append it
  // ourselves
  return libPaths.reduce(
    (stream, libPaths) => stream.pipe(dest(libPaths)),
    miscFiles,
  );
}

task('copy-misc', copyMisc);
