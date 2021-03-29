import { getDirs } from './util/task-helpers';

// All paths are related to the base dir
export const libPath = 'lib';
export const samplePath = 'sample';
export const distPath = 'dist';

export const libPaths = getDirs(libPath);
