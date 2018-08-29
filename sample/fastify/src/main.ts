import { NestFactory, FastifyAdapter } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { TerminusModule } from '../../../lib';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule, new FastifyAdapter());
  await app.listen(3000);
}
bootstrap();
