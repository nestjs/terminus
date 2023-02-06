import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    MikroOrmModule.forRoot({
      type: 'mysql',
      dbName: 'test',
      user: 'root',
      password: 'root',
      host: '0.0.0.0',
      port: 3306,
      discovery: { warnWhenNoEntities: false }, // disable validation entities
      strict: true,
    }),
    TerminusModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
