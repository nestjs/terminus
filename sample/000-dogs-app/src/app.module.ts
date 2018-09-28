import { Module } from '@nestjs/common';
import { TerminusModule } from '../../../lib/terminus.module';
import { DogModule } from './dog/dog.module';
import { CatModule } from './cat/cat.module';

@Module({
  imports: [
    TerminusModule.forRoot({
      healthUrl: '/healthcheck',
    }),
    DogModule,
    CatModule,
  ],
})
export class ApplicationModule {}
