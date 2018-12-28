import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { FastifyAdapter } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule, new FastifyAdapter());
  await app.listen(3000);
}
bootstrap();
