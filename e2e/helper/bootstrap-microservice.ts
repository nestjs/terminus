import { join } from 'node:path';
import { Controller, type INestMicroservice, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GrpcMethod, Transport } from '@nestjs/microservices';
import waitPort from 'wait-port';

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

export const GRPC_URL = '0.0.0.0:8890';
export const GRPC_PROTO = join(
  import.meta.dirname,
  '../../lib/health-indicator/microservice/protos/health.proto',
);

let servingStatus = 1;

@Controller()
class GrpcHealthController {
  @GrpcMethod('Health', 'Check')
  check() {
    return { status: servingStatus };
  }
}

@Module({ controllers: [GrpcHealthController] })
class GrpcApplicationModule {}

export async function bootstrapGrpcMicroservice(
  status = 1,
): Promise<INestMicroservice> {
  servingStatus = status;
  const app = await NestFactory.createMicroservice(GrpcApplicationModule, {
    transport: Transport.GRPC,
    options: {
      package: 'grpc.health.v1',
      protoPath: GRPC_PROTO,
      url: GRPC_URL,
    },
  });

  await app.listen();
  await waitPort({ host: '0.0.0.0', port: 8890 });
  return app;
}
