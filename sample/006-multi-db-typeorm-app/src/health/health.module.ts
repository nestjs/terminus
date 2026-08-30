import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: 'db1Connection',
      useFactory: () => ({
        type: 'mysql',
        connectorPackage: 'mysql2',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'root',
        database: 'test1',
        synchronize: true,
      }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'db2Connection',
      useFactory: () => ({
        type: 'mysql',
        connectorPackage: 'mysql2',
        host: 'localhost',
        port: 3307,
        username: 'root',
        password: 'root',
        database: 'test2',
        synchronize: true,
      }),
    }),
    TerminusModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
