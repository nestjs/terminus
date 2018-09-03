import { Module, Injectable } from '@nestjs/common';
import { TerminusModule } from '../../../lib/terminus.module';
import { TerminusOptions } from '../../../lib/interfaces/terminus-options';
import { TerminusOptionsFactory } from '../../../lib';

@Injectable()
export class TerminusService implements TerminusOptionsFactory {
  async createTerminusOptions(): Promise<TerminusOptions> {
    return {
      onSignal: this.onSignal,
      onShutdown: this.onShutdown,
      healthChecks: { '/health': this.health },
      logger: console.log,
      signal: 'SIGTERM',
    };
  }
  public async onSignal() {
    console.log('1. on Signal');
  }

  public async onShutdown() {
    console.log('2. on Shutdown');
  }

  public async health() {
    return true;
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
