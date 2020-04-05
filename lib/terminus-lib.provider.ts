import { TERMINUS_LIB } from './terminus.constants';
import { Provider } from '@nestjs/common';
import { checkPackages } from './utils';

/**
 * Create a wrapper so it is injectable & easier to test
 *
 * @internal
 */
export const TerminusLibProvider = {
  provide: TERMINUS_LIB,
  useFactory: () => {
    const [terminus] = checkPackages(
      ['@godaddy/terminus'],
      'the legacy Terminus API',
    );
    return terminus?.createTerminus;
  },
};
