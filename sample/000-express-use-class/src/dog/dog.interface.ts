export enum DogState {
  GOODBOY,
  BADBOY,
}

export interface Dog {
  name: string;
  state: DogState;
}
