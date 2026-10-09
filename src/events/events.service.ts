import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as amqp from 'amqplib';

// The shared topic exchange every ParkLink service publishes its domain events on --
// notifications-service consumes them (see its messaging/consumer.py).
const EVENTS_EXCHANGE = 'parklink.events';

/**
 * Publishes parking-service's domain events (e.g. `parking_spot.reviewed`) to RabbitMQ.
 * Best effort, like booking-service's publisher: the action that raised the event already
 * happened, so a broker that's down is logged, never surfaced as an error. The connection
 * is opened on first use and reopened after it drops.
 */
@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private channel: Promise<amqp.Channel> | null = null;
  private connection: amqp.ChannelModel | null = null;

  async publish(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    const url = process.env.RABBITMQ_URL;
    if (!url) {
      this.logger.warn(`RABBITMQ_URL not set, not publishing ${routingKey}`);
      return;
    }
    const event = {
      event_id: randomUUID(),
      event_type: routingKey,
      occurred_at: new Date().toISOString(),
      ...payload,
    };
    try {
      const channel = await this.getChannel(url);
      channel.publish(EVENTS_EXCHANGE, routingKey, Buffer.from(JSON.stringify(event)), {
        contentType: 'application/json',
        persistent: true,
        messageId: event.event_id,
      });
      this.logger.log(`event published: ${routingKey}`);
    } catch (error) {
      this.channel = null;
      this.logger.error(`failed to publish ${routingKey}: ${(error as Error).message}`);
    }
  }

  private getChannel(url: string): Promise<amqp.Channel> {
    if (!this.channel) {
      this.channel = (async () => {
        const connection = await amqp.connect(url);
        this.connection = connection;
        const reset = () => {
          this.channel = null;
          this.connection = null;
        };
        connection.on('close', reset);
        connection.on('error', reset);
        const channel = await connection.createChannel();
        await channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
        return channel;
      })();
      this.channel.catch(() => {
        this.channel = null;
      });
    }
    return this.channel;
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.close().catch(() => undefined);
  }
}
