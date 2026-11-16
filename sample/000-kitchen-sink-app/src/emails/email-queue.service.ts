import { Injectable } from '@nestjs/common';

/** Stands in for a real queue, e.g. BullMQ. */
@Injectable()
export class EmailQueueService {
  private readonly waiting: string[] = [];

  async add(email: string) {
    this.waiting.push(email);
  }

  async getWaitingCount() {
    return this.waiting.length;
  }
}
