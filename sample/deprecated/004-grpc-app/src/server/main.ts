import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { join } from 'path';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(ApplicationModule, {
    transport: Transport.GRPC,
    options: {
      package: 'grpc.health.v1',
      protoPath: join(__dirname, '../protos/health.proto'),
    },
  });
  app.listen(() => console.log('Microservice is listening'));
}
bootstrap();
