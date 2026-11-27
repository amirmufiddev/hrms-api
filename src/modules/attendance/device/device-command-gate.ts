import { Injectable } from '@nestjs/common';

/** Satu antrean untuk semua perintah web mesin dari proses HRMS Server. */
@Injectable()
export class DeviceCommandGate {
  private tail: Promise<void> = Promise.resolve();
  gapMs = 400;

  run<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task, task);
    this.tail = run.then(
      () => this.pause(),
      () => this.pause(),
    );
    return run;
  }

  private pause(): Promise<void> {
    if (this.gapMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.gapMs));
  }
}
