import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { TerminusOptionsService } from './terminus-options.service';

@Module({
  imports: [
    TerminusModule.forRootAsync({
      useClass: TerminusOptionsService,
    }),
  ],
})
export class HealthModule {}
