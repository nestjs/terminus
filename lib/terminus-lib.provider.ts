import { TERMINUS_LIB } from './terminus.constants';
import { createTerminus } from '@godaddy/terminus';

/**
 * Create a wrapper so it is injectable & easier to test
 *
 * @internal
 */
export const TerminusLibProvider = {
  provide: TERMINUS_LIB,
  useValue: createTerminus,
};
