import { type INestMicroservice, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import * as waitPort from 'wait-port';

@Module({})
class ApplicationModule {}

export async function bootstrapMicroservice(): Promise<INestMicroservice> {
  const app = await NestFactory.createMicroservice(ApplicationModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 8889,
    },
  });

  await app.listen();
  await waitPort({ host: '0.0.0.0', port: 8889 });
  return app;
}
