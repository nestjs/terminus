import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    MongooseModule.forRoot('mongodb://localhost:27017/test'),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
