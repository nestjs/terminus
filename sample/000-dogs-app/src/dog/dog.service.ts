import { Injectable } from '@nestjs/common';
import { DogState, Dog } from './interfaces/dog.interface';

@Injectable()
export class DogService {
  private dogs: Dog[] = [
    { name: 'Felix', state: DogState.GOOD_BOY },
    { name: 'Fido', state: DogState.GOOD_BOY },
    { name: 'Jazz', state: DogState.GOOD_BOY },
    { name: 'Sweetheart', state: DogState.GOOD_BOY },
    { name: 'Buttercup II', state: DogState.GOOD_BOY },
  ];

  public async getDogs(): Promise<Dog[]> {
    return this.dogs;
  }
}
