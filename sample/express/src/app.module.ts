import { Module, Injectable } from '@nestjs/common';
import { TerminusModule } from '../../../lib/terminus.module';
import { TerminusOptions } from '../../../lib/interfaces/terminus-options';

@Injectable()
export class TerminusService implements TerminusOptions {
  public async onSignal() {
    console.log('Got a signal');
  }

  public async onSigterm() {
    console.log('SIGTERM');
  }

  public async beforeShutdown() {
    console.log('Shutting down..');
  }
}

@Module({
  imports: [
    TerminusModule.forRootAsync({
      useClass: TerminusService,
    }),
  ],
})
export class ApplicationModule {}
