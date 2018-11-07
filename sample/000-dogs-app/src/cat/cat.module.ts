import { Module } from '@nestjs/common';
import { CatHealthIndicator } from './cat.health';

@Module({
  providers: [CatHealthIndicator],
  exports: [CatHealthIndicator],
})
export class CatModule {}
