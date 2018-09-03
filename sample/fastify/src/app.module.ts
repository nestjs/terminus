import { Module, Injectable } from '@nestjs/common';
import { TerminusModule } from '../../../lib/terminus.module';
import { TerminusOptions } from '../../../lib/interfaces/terminus-options';

@Injectable()
export class TerminusService implements TerminusOptions {
  public async onSignal() {
    console.log('1. on Signal');
  }

  public async onShutdown() {
    console.log('2. on Shutdown');
  }

  public async health() {
    return true;
  }

  public healthChecks = { '/health': this.health };
  public signal: string = 'SIGTERM';
  public logger = console.log;
}

@Module({
  imports: [
    TerminusModule.forRootAsync({
      useClass: TerminusService,
    }),
  ],
})
export class ApplicationModule {}
