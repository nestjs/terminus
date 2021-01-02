import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        name: 'db1Connection',
        type: 'mysql',
        host: 'localhost',
        port: 3306, 
        username: 'root', 
        password: 'root', 
        database: 'test1',
        synchronize: true,
      }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        name: 'db2Connection',
        type: 'mysql',
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
