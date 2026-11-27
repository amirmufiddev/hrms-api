import { Injectable, ServiceUnavailableException } from '@nestjs/common';

const SOCKET_OPEN = 1;

export type PushSocket = {
  readyState: number;
  send(data: string): void;
};

type Waiter = {
  cmd: string;
  timer: ReturnType<typeof setTimeout>;
  resolve: (message: Record<string, unknown>) => void;
  reject: (error: unknown) => void;
};

@Injectable()
export class DevicePushSession {
  private readonly sockets = new Map<string, PushSocket>();
  private readonly pending = new Map<PushSocket, Waiter[]>();

  attach(remote: string | undefined, socket: PushSocket) {
    const host = normalizeHost(remote);
    if (!host) return;
    const previous = this.sockets.get(host);
    if (previous && previous !== socket) this.detach(previous);
    this.sockets.set(host, socket);
  }

  detach(socket: PushSocket) {
    for (const [host, current] of this.sockets) {
      if (current === socket) this.sockets.delete(host);
    }
    const queue = this.pending.get(socket) ?? [];
    this.pending.delete(socket);
    for (const waiter of queue) {
      clearTimeout(waiter.timer);
      waiter.reject(new ServiceUnavailableException('DEVICE_OFFLINE'));
    }
  }

  takeReply(socket: PushSocket, message: Record<string, unknown>): boolean {
    const queue = this.pending.get(socket);
    const waiter = queue?.[0];
    if (!waiter) return false;
    const cmd = typeof message.cmd === 'string' ? message.cmd : '';
    if (cmd === 'reg' || cmd === 'sendlog' || cmd === 'senduser') return false;
    const ret = typeof message.ret === 'string' ? message.ret : '';
    const matched = ret === waiter.cmd || cmd === waiter.cmd;
    const anonymous = !cmd && !ret && typeof message.result === 'boolean';
    if (!matched && !anonymous) return false;
    queue?.shift();
    if (!queue?.length) this.pending.delete(socket);
    clearTimeout(waiter.timer);
    waiter.resolve(message);
    return true;
  }

  send(host: string, body: Record<string, unknown>, timeoutMs: number): Promise<Record<string, unknown>> {
    const socket = this.sockets.get(normalizeHost(host));
    if (!socket || socket.readyState !== SOCKET_OPEN) {
      return Promise.reject(new ServiceUnavailableException('DEVICE_OFFLINE'));
    }
    const cmd = String(body.cmd ?? '');
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        cmd,
        timer: setTimeout(() => {
          this.remove(socket, waiter);
          reject(new ServiceUnavailableException('DEVICE_OFFLINE'));
        }, timeoutMs),
        resolve,
        reject,
      };
      const queue = this.pending.get(socket) ?? [];
      queue.push(waiter);
      this.pending.set(socket, queue);
      try {
        socket.send(JSON.stringify(body));
      } catch (error) {
        this.remove(socket, waiter);
        reject(error instanceof ServiceUnavailableException ? error : new ServiceUnavailableException('DEVICE_OFFLINE'));
      }
    });
  }

  private remove(socket: PushSocket, waiter: Waiter) {
    const queue = this.pending.get(socket);
    if (!queue) return;
    const index = queue.indexOf(waiter);
    if (index < 0) return;
    queue.splice(index, 1);
    clearTimeout(waiter.timer);
    if (queue.length === 0) this.pending.delete(socket);
  }
}

export function normalizeHost(value: string | undefined): string {
  const raw = (value ?? '').trim().toLowerCase();
  if (raw.startsWith('::ffff:')) return raw.slice('::ffff:'.length);
  return raw;
}
