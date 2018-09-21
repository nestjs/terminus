import { Injectable } from '@nestjs/common';
import { DogState, Dog } from './dog.interface';

@Injectable()
export class DogService {
  private dogs: Dog[] = [
    { name: 'Felix', state: DogState.GOODBOY },
    { name: 'Fido', state: DogState.GOODBOY },
    { name: 'Jazz', state: DogState.GOODBOY },
    { name: 'Sweetheart', state: DogState.GOODBOY },
    { name: 'Buttercup II', state: DogState.GOODBOY },
  ];

  public async getDogs(): Promise<Dog[]> {
    return this.dogs;
  }
}
