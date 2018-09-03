import { Module } from '@nestjs/common';
import { TerminusModule } from '../../../lib/terminus.module';

@Module({
  imports: [
    TerminusModule.forRoot({
      async onShutdown() {
        console.log('Shutting down..');
      },
    }),
  ],
})
export class ApplicationModule {}
