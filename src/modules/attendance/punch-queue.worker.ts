import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PunchQueueService } from './punch-queue.service';

@Injectable()
export class PunchQueueWorker implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly queue: PunchQueueService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.queue.processOnce(), 5_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
