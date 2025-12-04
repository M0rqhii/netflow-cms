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
   * AI Note: Uses Prisma Webhook model with support for per-collection webhooks
   */
  async create(tenantId: string, dto: CreateWebhookDto) {
    // Validate collection exists if collectionId provided
    if (dto.collectionId) {
      const collection = await this.prisma.collection.findFirst({
        where: {
          id: dto.collectionId,
          tenantId,
        },
      });
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }
    }

    // Generate secret if not provided
    const secret = dto.secret || this.generateSecret();

    // Use Prisma Webhook model
    return this.prisma.webhook.create({
      data: {
        tenantId,
        collectionId: dto.collectionId || null,
        url: dto.url,
        events: dto.events,
        secret,
        active: dto.active ?? true,
        description: dto.description,
        retryCount: dto.retryCount || 3,
        timeout: dto.timeout || 5000,
      },
    });
  }

  /**
   * Get all webhooks for a tenant (optionally filtered by collection)
   */
  async findAll(tenantId: string, collectionId?: string) {
    return this.prisma.webhook.findMany({
      where: {
        tenantId,
        ...(collectionId ? { collectionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single webhook by ID
   */
  async findOne(tenantId: string, id: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    return webhook;
  }

  /**
   * Update a webhook
   */
  async update(tenantId: string, id: string, dto: UpdateWebhookDto) {
    // Verify webhook exists
    await this.findOne(tenantId, id);

    // Validate collection if collectionId is being updated
    if (dto.collectionId !== undefined && dto.collectionId !== null) {
      const collection = await this.prisma.collection.findFirst({
        where: {
          id: dto.collectionId,
          tenantId,
        },
      });
      if (!collection) {
        throw new NotFoundException('Collection not found');
      }
    }

    return this.prisma.webhook.update({
      where: { id },
      data: {
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.events !== undefined && { events: dto.events }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.collectionId !== undefined && { collectionId: dto.collectionId || null }),
        ...(dto.retryCount !== undefined && { retryCount: dto.retryCount }),
        ...(dto.timeout !== undefined && { timeout: dto.timeout }),
      },
    });
  }

  /**
   * Delete a webhook
   */
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.webhook.delete({
      where: { id },
    });
    return { success: true };
  }

  /**
   * Trigger webhooks for an event
   * AI Note: Delivers webhook events to registered URLs
   * Supports per-collection webhooks via collectionId parameter
   */
  async trigger(tenantId: string, event: WebhookEvent, payload: any, collectionId?: string) {
    // Find webhooks: global (collectionId is null) or specific to collection
    const where: any = {
      tenantId,
      active: true,
    };

    // Get webhooks: global ones (collectionId is null) OR collection-specific ones
    const allWebhooks = await this.prisma.webhook.findMany({
      where: {
        ...where,
        OR: [
          { collectionId: null }, // Global webhooks
          ...(collectionId ? [{ collectionId }] : []), // Collection-specific webhooks
        ],
      },
    });

    // Filter by event type
    const webhooks = allWebhooks.filter(
      (w) => w.events.includes(event),
    );

    // Deliver webhooks asynchronously with retry logic
    const deliveries = webhooks.map((webhook) =>
      this.deliverWithRetry(webhook, event, payload),
    );

    await Promise.allSettled(deliveries);

    return {
      triggered: webhooks.length,
      event,
      collectionId: collectionId || null,
    };
  }

  /**
   * Deliver webhook with retry logic
   * AI Note: Attempts delivery with configurable retry count
   */
  private async deliverWithRetry(webhook: any, event: WebhookEvent, payload: any) {
    const maxAttempts = webhook.retryCount || 3;
    let attempt = 1;
    let lastError: Error | null = null;

    while (attempt <= maxAttempts) {
      try {
        await this.deliver(webhook, event, payload, attempt);
        return; // Success
      } catch (error: any) {
        lastError = error;
        attempt++;
        if (attempt <= maxAttempts) {
          // Exponential backoff: wait 1s, 2s, 4s...
          const delay = Math.min(1000 * Math.pow(2, attempt - 2), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    this.logger.error(`Webhook ${webhook.id} failed after ${maxAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Deliver webhook to URL
   * AI Note: Sends HTTP POST request to webhook URL with signed payload
   */
  private async deliver(webhook: { id: string; url: string; secret: string; active: boolean; events: string[]; timeout?: number }, event: WebhookEvent, payload: any, attempt: number = 1) {
    const timestamp = Date.now();
    const body = {
      event,
      timestamp,
      data: payload,
    };

    // Generate signature
    const signature = this.generateSignature(webhook.secret, JSON.stringify(body));

    const timeout = webhook.timeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
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
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      // Log successful delivery
      await this.logDelivery(webhook.id, 'success', event, response.status, attempt);
    } catch (error: any) {
      clearTimeout(timeoutId);
      // Log failed delivery
      await this.logDelivery(webhook.id, 'failed', event, undefined, attempt, error?.message || 'Unknown error');
      throw error; // Re-throw for retry logic
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
   * AI Note: Logs webhook delivery attempts (success/failure) with retry attempt tracking
   */
  private async logDelivery(
    webhookId: string,
    status: 'success' | 'failed',
    event: string,
    statusCode?: number,
    attempt: number = 1,
    error?: string,
  ) {
    // Get webhook to get tenantId
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
      select: { tenantId: true },
    });

    if (!webhook) {
      this.logger.warn(`Webhook ${webhookId} not found for delivery logging`);
      return;
    }

    // Store delivery log in database
    await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        tenantId: webhook.tenantId,
        event,
        status,
        statusCode: statusCode || undefined,
        error: error || undefined,
        attempt,
        deliveredAt: status === 'success' ? new Date() : undefined,
      },
    });

    // Also log to console
    const message = `[WEBHOOK] ${status.toUpperCase()} - Webhook: ${webhookId}, Event: ${event}, Attempt: ${attempt}`;
    if (error) {
      this.logger.error(message, error);
    } else {
      this.logger.log(message);
    }
  }
}

