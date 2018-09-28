import { Module } from '@nestjs/common';
import { DogHealth } from './dog.health';
import { DogService } from './dog.service';

@Module({
  providers: [DogService, DogHealth],
})
export class DogModule {}
