import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'grpc.health.v1',
      protoPath: join(__dirname, '../protos/health.proto'),
    },
  });
  app.listen();
}
bootstrap();
