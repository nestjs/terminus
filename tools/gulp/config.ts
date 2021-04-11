import { getDirs } from './util/task-helpers';
import { join } from 'path';

// All paths are related to the base dir
export const rootFolder = join(__dirname, '../../');
export const tsconfig = join(rootFolder, 'tsconfig.json');
export const libPath = join(rootFolder, 'lib');
export const samplePath = join(rootFolder, 'sample');
export const distPath = join(rootFolder, 'dist');

export const libPaths = getDirs(libPath);
