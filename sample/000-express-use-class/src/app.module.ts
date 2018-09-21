import { Module, Injectable } from '@nestjs/common';
import { TerminusModule } from '../../../lib/terminus.module';
import { TerminusOptions } from '../../../lib/interfaces/terminus-options';
import { TerminusOptionsFactory, TerminusModuleOptions } from '../../../lib';
import { DogModule } from './dog/dog.module';

@Injectable()
export class TerminusService implements TerminusOptionsFactory {
  async createTerminusOptions(): Promise<TerminusModuleOptions> {
    return {
      healthUrl: '/healthcheck',
    };
  }
}

@Module({
  imports: [DogModule],
})
export class ApplicationModule {}
