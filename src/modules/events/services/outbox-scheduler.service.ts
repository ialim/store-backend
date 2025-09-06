import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

@Injectable()
export class OutboxSchedulerService {
  constructor(private dispatcher: OutboxDispatcherService) {}

  // Every 5s
  @Interval(5000)
  async handleInterval() {
    await this.dispatcher.runOnce({ limit: 20 });
  }
}

