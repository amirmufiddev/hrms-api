import { Injectable, Optional } from '@nestjs/common';

export type PaceKind = 'auto' | 'manual';

export type PaceDecision =
  | { ok: true }
  | { ok: false; reason: 'QUIET'; quietUntil: Date }
  | { ok: false; reason: 'BUDGET' | 'MANUAL_USED'; quietUntil: null };

type Clock = { now: () => number; wait: (ms: number) => Promise<void> };

type PaceState = {
  windowStarted: number;
  sent: number;
  lastAt: number;
  quietUntil: number;
  manualUsed: boolean;
  manualArmed: boolean;
  quietAfterClick: boolean;
  resumeAfter: string;
  logFrom: number;
  listedAt: number;
};

const WINDOW_MS = 2 * 60 * 1000;
const QUIET_MS = 10 * 60 * 1000;
const GAP_MS = 3_000;
const AUTO_LIMIT = 10;
const MANUAL_EXTRA = 8;
const NO_LAST_COMMAND = -1;
const NEVER_LISTED = -1;
const LIST_GAP_MS = 10 * 60 * 1000;
const SLOW_MS = 8_000;

const systemClock: Clock = {
  now: () => Date.now(),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

@Injectable()
export class DevicePace {
  private readonly states = new Map<string, PaceState>();
  private readonly allowQueues = new Map<string, Promise<unknown>>();
  private readonly armedDevices = new Set<string>();

  private readonly clock: Clock;

  constructor(@Optional() clock?: Clock) {
    this.clock = clock ?? systemClock;
  }

  preview(deviceId: string, kind: PaceKind): PaceDecision {
    const state = this.ensure(deviceId);
    const now = this.clock.now();
    if (kind !== 'manual' && state.quietUntil > now) {
      return { ok: false, reason: 'QUIET', quietUntil: new Date(state.quietUntil) };
    }
    const window = this.effectiveWindow(state, now);
    const limit = kind === 'manual' ? AUTO_LIMIT + MANUAL_EXTRA : AUTO_LIMIT;
    if (window.sent >= limit) return { ok: false, reason: 'BUDGET', quietUntil: null };
    return { ok: true };
  }

  allow(deviceId: string, kind: PaceKind): Promise<PaceDecision> {
    const previous = this.allowQueues.get(deviceId) ?? Promise.resolve();
    const run = previous.then(() => this.allowQueued(deviceId, kind));
    this.allowQueues.set(
      deviceId,
      run.then(
        () => undefined,
        () => undefined,
      ),
    );
    return run;
  }

  markOffline(deviceId: string): Date {
    const state = this.ensure(deviceId);
    state.quietUntil = this.clock.now() + QUIET_MS;
    return new Date(state.quietUntil);
  }

  markManualUsed(deviceId: string): void {
    this.ensure(deviceId).manualUsed = true;
  }

  armManual(deviceId: string): void {
    const state = this.ensure(deviceId);
    state.manualArmed = true;
    this.armedDevices.add(deviceId);
  }

  finishManualClick(): void {
    for (const [deviceId, state] of this.states) {
      if (!state.quietAfterClick) continue;
      state.quietAfterClick = false;
      this.markOffline(deviceId);
    }
    for (const deviceId of this.armedDevices) {
      const state = this.states.get(deviceId);
      if (!state) continue;
      state.manualArmed = false;
    }
    this.armedDevices.clear();
  }

  resumeAfter(deviceId: string): string {
    return this.ensure(deviceId).resumeAfter;
  }

  setResumeAfter(deviceId: string, enrollId: string): void {
    this.ensure(deviceId).resumeAfter = enrollId;
  }

  logFrom(deviceId: string): number {
    return this.ensure(deviceId).logFrom;
  }

  setLogFrom(deviceId: string, from: number): void {
    this.ensure(deviceId).logFrom = from;
  }

  now(): number {
    return this.clock.now();
  }

  noteListed(deviceId: string): void {
    this.ensure(deviceId).listedAt = this.clock.now();
  }

  /** Daftar user otomatis paling cepat sekali tiap 10 menit. Daftar kedua dalam 2 menit membuat firmware restart. */
  listBlocked(deviceId: string): boolean {
    const listedAt = this.ensure(deviceId).listedAt;
    return listedAt >= 0 && this.clock.now() - listedAt < LIST_GAP_MS;
  }

  /** Perintah yang baru selesai tetapi lambat berarti mesin sedang kewalahan. Diamkan 10 menit. */
  markIfSlow(deviceId: string, started: number): boolean {
    if (this.clock.now() - started < SLOW_MS) return false;
    const state = this.ensure(deviceId);
    if (state.manualArmed) {
      state.quietAfterClick = true;
      return true;
    }
    this.markOffline(deviceId);
    return true;
  }

  quietDevices(): { deviceId: string; until: Date }[] {
    const now = this.clock.now();
    const rows: { deviceId: string; until: Date }[] = [];
    for (const [deviceId, state] of this.states) {
      if (state.quietUntil > now) rows.push({ deviceId, until: new Date(state.quietUntil) });
    }
    return rows;
  }

  private async allowQueued(deviceId: string, kind: PaceKind): Promise<PaceDecision> {
    const state = this.ensure(deviceId);
    const now = this.clock.now();
    if (kind !== 'manual' && state.quietUntil > now) {
      return { ok: false, reason: 'QUIET', quietUntil: new Date(state.quietUntil) };
    }
    this.resetWindowIfExpired(deviceId, state, now);
    const limit = kind === 'manual' ? AUTO_LIMIT + MANUAL_EXTRA : AUTO_LIMIT;
    if (state.sent >= limit) return { ok: false, reason: 'BUDGET', quietUntil: null };
    state.sent += 1;
    if (state.windowStarted === 0) state.windowStarted = now;
    const wait = state.lastAt >= 0 ? Math.max(0, GAP_MS - (now - state.lastAt)) : 0;
    if (wait > 0) await this.clock.wait(wait);
    state.lastAt = this.clock.now();
    return { ok: true };
  }

  private effectiveWindow(state: PaceState, now: number): { sent: number; manualUsed: boolean } {
    if (state.windowStarted !== 0 && now - state.windowStarted >= WINDOW_MS) {
      return { sent: 0, manualUsed: false };
    }
    return { sent: state.sent, manualUsed: state.manualUsed };
  }

  private resetWindowIfExpired(deviceId: string, state: PaceState, now: number): void {
    if (state.windowStarted === 0) return;
    if (now - state.windowStarted < WINDOW_MS) return;
    state.windowStarted = 0;
    state.sent = 0;
    state.manualUsed = false;
    state.manualArmed = false;
    this.armedDevices.delete(deviceId);
  }

  private ensure(deviceId: string): PaceState {
    const found = this.states.get(deviceId);
    if (found) return found;
    const created: PaceState = {
      windowStarted: 0,
      sent: 0,
      lastAt: NO_LAST_COMMAND,
      quietUntil: 0,
      manualUsed: false,
      manualArmed: false,
      quietAfterClick: false,
      resumeAfter: '',
      logFrom: 0,
      listedAt: NEVER_LISTED,
    };
    this.states.set(deviceId, created);
    return created;
  }
}
