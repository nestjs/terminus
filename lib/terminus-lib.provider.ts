import { TERMINUS_LIB } from './terminus.constants';
import { createTerminus } from '@godaddy/terminus';

/**
 * The type of the Terminus instance
 */
export type TerminusLib = typeof createTerminus;

/**
 * Create a wrapper so it is injectable & easier to test
 */
export const TerminusLibProvider = {
  provide: TERMINUS_LIB,
  useValue: createTerminus as any,
};
