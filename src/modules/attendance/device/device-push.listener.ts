import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket, WebSocketServer } from 'ws';
import { answerDevice, DevicePushMessage } from './device-push-protocol';
import { DevicePushIngestService } from './device-push-ingest.service';
import { DevicePushSession } from './device-push.session';

@Injectable()
export class DevicePushListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DevicePushListener.name);
  private server: WebSocketServer | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly ingest: DevicePushIngestService,
    private readonly session: DevicePushSession,
  ) {}

  onModuleInit() {
    const port = Number(this.config.get<string>('DEVICE_PUSH_PORT') ?? 7788);
    const host = this.config.get<string>('DEVICE_PUSH_HOST') ?? '0.0.0.0';
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      this.logger.warn('DEVICE_PUSH_PORT tidak valid, pendengar push mesin tidak dinyalakan');
      return;
    }
    const server = new WebSocketServer({ port, host });
    server.on('error', (error) => {
      this.logger.warn(`Pendengar push mesin gagal: ${error.message}`);
    });
    server.on('connection', (socket, request) => {
      const remote = request.socket.remoteAddress;
      this.session.attach(remote, socket);
      this.logger.log(`Mesin tersambung dari ${remote ?? '-'}`);
      socket.on('error', (error) => this.logger.warn(error.message));
      socket.on('close', () => this.session.detach(socket));
      socket.on('message', (data) => {
        void this.onMessage(socket, remote, data);
      });
    });
    this.server = server;
    this.logger.log(`Pendengar push mesin di ${host}:${port}`);
  }

  onModuleDestroy() {
    this.server?.close();
    this.server = null;
  }

  private async onMessage(socket: WebSocket, remote: string | undefined, data: unknown) {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(String(data)) as Record<string, unknown>;
    } catch {
      this.logger.warn(`Data mesin bukan JSON: ${String(data).slice(0, 80)}`);
      return;
    }
    if (this.session.takeReply(socket, message)) return;
    const answer = answerDevice(message as DevicePushMessage, new Date());
    if (message.cmd === 'reg') await this.ingest.noteConnection(remote, message.sn);
    if (message.cmd === 'senduser' && !answer.enrollment) await this.ingest.noteRejected(remote, message.sn);
    if (answer.enrollment) {
      const saved = await this.ingest.acceptEnrollment(remote, answer.enrollment, message.sn);
      if (!saved) {
        answer.reply.result = false;
        answer.reply.reason = 1;
      }
    } else if (answer.logs.length > 0) {
      const saved = await this.ingest.accept(remote, answer.logs, message.sn);
      if (!saved) {
        answer.reply.result = false;
        answer.reply.reason = 1;
      }
    }
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(answer.reply));
    }
  }
}
