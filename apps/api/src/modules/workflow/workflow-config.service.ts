import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';

/**
 * Workflow Configuration Service
 * AI Note: Manages workflow configuration per collection and automatic task creation
 */
@Injectable()
export class WorkflowConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * Get workflow configuration for a collection
   */
  async getWorkflowConfig(siteId: string, collectionId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        siteId,
      },
      select: {
        id: true,
        workflowConfig: true,
      } as any, // workflowConfig is Json? field in Prisma schema
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Default workflow configuration
    const defaultConfig = {
      stages: ['draft', 'review', 'approved', 'published', 'archived'],
      requireReview: true,
      autoTasks: {
        onReview: {
          enabled: true,
          title: 'Review content',
          description: 'Content has been submitted for review',
          priority: 'MEDIUM',
        },
        onApproved: {
          enabled: true,
          title: 'Content approved',
          description: 'Content has been approved and is ready for publishing',
          priority: 'LOW',
        },
        onPublished: {
          enabled: true,
          title: 'Content published',
          description: 'Content has been published',
          priority: 'LOW',
        },
      },
    };

    return (collection as any).workflowConfig || defaultConfig;
  }

  /**
   * Update workflow configuration for a collection
   */
  async updateWorkflowConfig(
    siteId: string,
    collectionId: string,
    config: {
      stages?: string[];
      requireReview?: boolean;
      autoTasks?: {
        onReview?: { enabled: boolean; title?: string; description?: string; priority?: string };
        onApproved?: { enabled: boolean; title?: string; description?: string; priority?: string };
        onPublished?: { enabled: boolean; title?: string; description?: string; priority?: string };
      };
    },
  ) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        siteId,
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const currentConfig = ((collection as any).workflowConfig as any) || {};
    const updatedConfig = {
      ...currentConfig,
      ...config,
      autoTasks: {
        ...currentConfig.autoTasks,
        ...config.autoTasks,
      },
    };

    return this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        workflowConfig: updatedConfig,
      } as any, // workflowConfig is Json? field in Prisma schema
    });
  }

  /**
   * Create automatic tasks when status changes
   */
  async createAutoTasks(
    siteId: string,
    collectionId: string,
    itemId: string,
    oldStatus: string,
    newStatus: string,
    userId: string,
  ) {
    const config = await this.getWorkflowConfig(siteId, collectionId);
    const autoTasks = (config as any).autoTasks || {};

    const tasks: Array<Promise<any>> = [];

    // Task on review
    if (newStatus === 'review' && oldStatus !== 'review' && autoTasks.onReview?.enabled) {
      tasks.push(
        this.tasksService.create(siteId, userId, {
          title: autoTasks.onReview.title || 'Review content',
          description: autoTasks.onReview.description || 'Content has been submitted for review',
          priority: (autoTasks.onReview.priority as any) || 'MEDIUM',
          status: 'PENDING',
          collectionItemId: itemId,
        }),
      );
    }

    // Task on approved
    if (newStatus === 'approved' && oldStatus !== 'approved' && autoTasks.onApproved?.enabled) {
      tasks.push(
        this.tasksService.create(siteId, userId, {
          title: autoTasks.onApproved.title || 'Content approved',
          description: autoTasks.onApproved.description || 'Content has been approved and is ready for publishing',
          priority: (autoTasks.onApproved.priority as any) || 'LOW',
          status: 'PENDING',
          collectionItemId: itemId,
        }),
      );
    }

    // Task on published
    if (newStatus === 'published' && oldStatus !== 'published' && autoTasks.onPublished?.enabled) {
      tasks.push(
        this.tasksService.create(siteId, userId, {
          title: autoTasks.onPublished.title || 'Content published',
          description: autoTasks.onPublished.description || 'Content has been published',
          priority: (autoTasks.onPublished.priority as any) || 'LOW',
          status: 'PENDING',
          collectionItemId: itemId,
        }),
      );
    }

    await Promise.allSettled(tasks);
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(
    config: any,
    oldStatus: string,
    newStatus: string,
  ): { valid: boolean; reason?: string } {
    const stages = config.stages || ['draft', 'review', 'approved', 'published', 'archived'];
    const oldLower = oldStatus.toLowerCase();
    const newLower = newStatus.toLowerCase();
    const oldIndex = stages.indexOf(oldLower);
    const newIndex = stages.indexOf(newLower);

    if (oldIndex === -1 || newIndex === -1) {
      return { valid: false, reason: 'Invalid status' };
    }

    // Allow forward transitions and archived from any status
    if (newLower === 'archived') {
      return { valid: true };
    }

    // Allow direct publish for draft items (items only support DRAFT/PUBLISHED)
    if (oldLower === 'draft' && newLower === 'published') {
      return { valid: true };
    }

    // Allow moving forward or backward by one step
    if (Math.abs(newIndex - oldIndex) <= 1) {
      return { valid: true };
    }

    // Special: allow draft -> review -> approved -> published
    if (
      (oldStatus === 'draft' && newStatus === 'review') ||
      (oldStatus === 'review' && newStatus === 'approved') ||
      (oldStatus === 'approved' && newStatus === 'published') ||
      (oldStatus === 'review' && newStatus === 'draft') ||
      (oldStatus === 'approved' && newStatus === 'review') ||
      (oldStatus === 'published' && newStatus === 'approved')
    ) {
      return { valid: true };
    }

    return { valid: false, reason: 'Invalid status transition' };
  }
}


