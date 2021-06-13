import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/test1', {
      connectionName: 'mongodb1',
    }),
    MongooseModule.forRoot('mongodb://localhost:27018/test2', {
      connectionName: 'mongodb2',
    }),
    TerminusModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
