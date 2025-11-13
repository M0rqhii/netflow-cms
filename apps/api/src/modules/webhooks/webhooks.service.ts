import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import * as crypto from 'crypto';
// Note: axios is not installed, using fetch for MVP
// In production, install axios: npm install axios

// Note: For MVP, webhooks are stored in a simple structure
// In production, create a Webhook model in Prisma schema

/**
 * Webhook Events
 * AI Note: Supported webhook events
 */
export enum WebhookEvent {
  // Content Events
  CONTENT_CREATED = 'content.created',
  CONTENT_UPDATED = 'content.updated',
  CONTENT_DELETED = 'content.deleted',
  CONTENT_PUBLISHED = 'content.published',
  CONTENT_UNPUBLISHED = 'content.unpublished',
  
  // Collection Events
  COLLECTION_CREATED = 'collection.created',
  COLLECTION_UPDATED = 'collection.updated',
  COLLECTION_DELETED = 'collection.deleted',
  COLLECTION_ITEM_CREATED = 'collection.item.created',
  COLLECTION_ITEM_UPDATED = 'collection.item.updated',
  COLLECTION_ITEM_DELETED = 'collection.item.deleted',
  
  // Media Events
  MEDIA_UPLOADED = 'media.uploaded',
  MEDIA_DELETED = 'media.deleted',
  
  // Tenant Events
  TENANT_CREATED = 'tenant.created',
  TENANT_UPDATED = 'tenant.updated',
  TENANT_DELETED = 'tenant.deleted',
  
  // User Events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
}

/**
 * Webhooks Service - handles webhook management and delivery
 * AI Note: Manages webhook configurations and delivers events to registered URLs
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
  ) {}

  /**
   * Create a webhook
   * AI Note: For MVP, webhooks are stored in a JSON field in Tenant settings
   * In production, create a Webhook model in Prisma schema
   */
  async create(tenantId: string, dto: CreateWebhookDto) {
    // Generate secret if not provided
    const secret = dto.secret || this.generateSecret();

    // For MVP, store webhooks in Tenant.settings.webhooks
    // In production, use a dedicated Webhook model
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const settings = (tenant.settings as any) || {};
    const webhooks = settings.webhooks || [];
    
    const webhook = {
      id: crypto.randomUUID(),
      url: dto.url,
      events: dto.events,
      secret,
      active: dto.active ?? true,
      description: dto.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    webhooks.push(webhook);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...settings,
          webhooks,
        },
      },
    });

    return webhook;
  }

  /**
   * Get all webhooks for a tenant
   */
  async findAll(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const settings = (tenant.settings as any) || {};
    return settings.webhooks || [];
  }

  /**
   * Get a single webhook by ID
   */
  async findOne(tenantId: string, id: string) {
    const webhooks = await this.findAll(tenantId);
    const webhook = webhooks.find((w: any) => w.id === id);

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    return webhook;
  }

  /**
   * Update a webhook
   */
  async update(tenantId: string, id: string, dto: UpdateWebhookDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const settings = (tenant.settings as any) || {};
    const webhooks = settings.webhooks || [];
    const index = webhooks.findIndex((w: any) => w.id === id);

    if (index === -1) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    const webhook = webhooks[index];
    const updated = {
      ...webhook,
      ...dto,
      updatedAt: new Date(),
    };

    webhooks[index] = updated;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...settings,
          webhooks,
        },
      },
    });

    return updated;
  }

  /**
   * Delete a webhook
   */
  async remove(tenantId: string, id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const settings = (tenant.settings as any) || {};
    const webhooks = settings.webhooks || [];
    const index = webhooks.findIndex((w: any) => w.id === id);

    if (index === -1) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    const webhook = webhooks[index];
    webhooks.splice(index, 1);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...settings,
          webhooks,
        },
      },
    });

    return { success: true, deleted: webhook };
  }

  /**
   * Trigger webhooks for an event
   * AI Note: Delivers webhook events to registered URLs
   */
  async trigger(tenantId: string, event: WebhookEvent, payload: any) {
    const allWebhooks = await this.findAll(tenantId);
    const webhooks = allWebhooks.filter(
      (w: { active: boolean; events: string[] }) => w.active && w.events.includes(event),
    );

    // Deliver webhooks asynchronously
    const deliveries = webhooks.map((webhook: { id: string; url: string; secret: string; active: boolean; events: string[] }) =>
      this.deliver(webhook, event, payload),
    );

    await Promise.allSettled(deliveries);

    return {
      triggered: webhooks.length,
      event,
    };
  }

  /**
   * Deliver webhook to URL
   * AI Note: Sends HTTP POST request to webhook URL with signed payload
   */
  private async deliver(webhook: { id: string; url: string; secret: string; active: boolean; events: string[] }, event: WebhookEvent, payload: any) {
    const timestamp = Date.now();
    const body = {
      event,
      timestamp,
      data: payload,
    };

    // Generate signature
    const signature = this.generateSignature(webhook.secret, JSON.stringify(body));

    try {
      // Use fetch for MVP (axios not installed)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': timestamp.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Log successful delivery
      await this.logDelivery(webhook.id, 'success', event);
    } catch (error: any) {
      // Log failed delivery
      await this.logDelivery(webhook.id, 'failed', event, error?.message || 'Unknown error');
      // Don't throw - allow other webhooks to be delivered
    }
  }

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(secret: string, payload: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Log webhook delivery
   * AI Note: Logs webhook delivery attempts (success/failure)
   */
  private async logDelivery(
    webhookId: string,
    status: 'success' | 'failed',
    event: string,
    error?: string,
  ) {
    // Use proper logger instead of console.log
    // In production, store in database (WebhookDelivery model)
    const message = `[WEBHOOK] ${status.toUpperCase()} - Webhook: ${webhookId}, Event: ${event}`;
    if (error) {
      this.logger.error(message, error);
    } else {
      this.logger.log(message);
    }
  }
}

