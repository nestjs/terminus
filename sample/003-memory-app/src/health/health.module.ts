import { Module } from '@nestjs/common';
import { TerminusModule } from '../../../../lib';

import { TerminusOptionsService } from './terminus-options.service';

@Module({
  imports: [
    TerminusModule.forRootAsync({
      useClass: TerminusOptionsService,
    }),
  ],
})
export class HealthModule {}
