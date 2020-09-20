export enum DogState {
  GOOD_BOY,
  BAD_BOY,
}

export interface Dog {
  name: string;
  state: DogState;
}
