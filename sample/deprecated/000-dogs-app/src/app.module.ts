import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DogModule } from './dog/dog.module';
import { TerminusModule } from '@nestjs/terminus';
import { TerminusOptionsService } from './health/terminus-options.service';

@Module({
  imports: [
    HealthModule,
    DogModule,
    TerminusModule.forRootAsync({
      imports: [HealthModule],
      useExisting: TerminusOptionsService,
    }),
  ],
})
export class ApplicationModule {}
