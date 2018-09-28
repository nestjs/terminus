import { Module } from '@nestjs/common';
import { CatHealth } from './cat.health';

@Module({
  providers: [CatHealth],
})
export class CatModule {}
