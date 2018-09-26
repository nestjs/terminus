import { Module } from '@nestjs/common';
import { TerminusModule } from '../../../lib/terminus.module';
import { DogModule } from './dog/dog.module';

@Module({
  imports: [
    TerminusModule.forRoot({
      healthUrl: '/healthcheck',
    }),
    DogModule,
  ],
})
export class ApplicationModule {}
