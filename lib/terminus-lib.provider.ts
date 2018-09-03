import { TERMINUS_LIB } from './terminus.constants';
import * as terminus from '@godaddy/terminus';

/**
 * The type of the Terminus instance
 */
export type TerminusLib = typeof terminus;

/**
 * Create a wrapper so it is injectable & easier to test
 */
export const TerminusLibProvider = {
  provide: TERMINUS_LIB,
  useValue: terminus as any,
};
