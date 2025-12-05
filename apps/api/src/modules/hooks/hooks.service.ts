import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateHookDto, UpdateHookDto } from './dto';

/**
 * Hooks Service - configurable hooks per tenant/collection
 * AI Note: Provides extensibility through configurable hooks
 */
@Injectable()
export class HooksService {
  private readonly logger = new Logger(HooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a hook
   */
  async create(tenantId: string, dto: CreateHookDto) {
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

    // Hook type is validated by Zod schema, no need to validate here

    return this.prisma.hook.create({
      data: {
        tenantId,
        collectionId: dto.collectionId || null,
        name: dto.name,
        type: dto.type,
        event: dto.event,
        handler: dto.handler,
        config: (dto.config || {}) as any, // JsonValue type compatibility
        active: dto.active ?? true,
        priority: dto.priority || 0,
      },
    });
  }

  /**
   * Get all hooks for a tenant (optionally filtered by collection)
   */
  async findAll(tenantId: string, collectionId?: string) {
    return this.prisma.hook.findMany({
      where: {
        tenantId,
        ...(collectionId ? { collectionId } : {}),
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get a single hook by ID
   */
  async findOne(tenantId: string, id: string) {
    const hook = await this.prisma.hook.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!hook) {
      throw new NotFoundException(`Hook with ID ${id} not found`);
    }

    return hook;
  }

  /**
   * Update a hook
   */
  async update(tenantId: string, id: string, dto: UpdateHookDto) {
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

    // Hook type is validated by Zod schema, no need to validate here

    return this.prisma.hook.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.event !== undefined && { event: dto.event }),
        ...(dto.handler !== undefined && { handler: dto.handler }),
        ...(dto.config !== undefined && { config: dto.config as any }), // JsonValue type compatibility
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.collectionId !== undefined && { collectionId: dto.collectionId || null }),
      },
    });
  }

  /**
   * Delete a hook
   */
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.hook.delete({
      where: { id },
    });
    return { success: true };
  }

  /**
   * Execute hooks for an event
   * AI Note: Executes hooks in priority order (lower priority = earlier execution)
   */
  async executeHooks(
    tenantId: string,
    event: string,
    data: any,
    collectionId?: string,
  ): Promise<any> {
    // Get active hooks for this event
    const hooks = await this.prisma.hook.findMany({
      where: {
        tenantId,
        event,
        active: true,
        OR: [
          { collectionId: null }, // Global hooks
          ...(collectionId ? [{ collectionId }] : []), // Collection-specific hooks
        ],
      },
      orderBy: {
        priority: 'asc',
      },
    });

    let result = data;

    // Execute hooks in order
    for (const hook of hooks) {
      try {
        result = await this.executeHook(hook, result);
      } catch (error: any) {
        // Log error but continue with other hooks
        this.logger.error(`Hook ${hook.id} failed:`, error instanceof Error ? error.stack : error.message);
        // For 'before' hooks, failure might stop execution
        if (hook.type === 'before') {
          throw new Error(`Hook ${hook.name} failed: ${error.message}`);
        }
      }
    }

    return result;
  }

  /**
   * Execute a single hook
   */
  private async executeHook(hook: any, data: any): Promise<any> {
    // Handle different hook handler types
    if (hook.handler.startsWith('http://') || hook.handler.startsWith('https://')) {
      // HTTP webhook
      return this.executeHttpHook(hook, data);
    } else if (hook.handler.startsWith('function:')) {
      // Function name (for future extension with function registry)
      throw new Error('Function hooks not yet implemented');
    } else {
      throw new Error(`Unknown hook handler type: ${hook.handler}`);
    }
  }

  /**
   * Execute HTTP webhook hook
   */
  private async executeHttpHook(hook: any, data: any): Promise<any> {
    const timeout = (hook.config as any)?.timeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(hook.handler, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...((hook.config as any)?.headers || {}),
        },
        body: JSON.stringify({
          event: hook.event,
          type: hook.type,
          data,
          config: hook.config,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // For 'transform' hooks, return transformed data
      if (hook.type === 'transform') {
        const transformed = await response.json() as { data?: any };
        return transformed.data || data;
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

