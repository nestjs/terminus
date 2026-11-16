import { Injectable } from '@nestjs/common';

/** Stands in for a real cache, e.g. Redis. */
@Injectable()
export class CacheService {
  async isConnected() {
    return true;
  }
}
