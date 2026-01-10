import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaOptimizationService } from '../../common/prisma/prisma-optimization.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto';

/**
 * Tasks Service
 * AI Note: Manages workflow tasks for content entries and collection items
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaOptimization: PrismaOptimizationService,
  ) {}

  /**
   * Create a new task
   */
  async create(siteId: string, userId: string, dto: CreateTaskDto) {
    // Validate content entry exists if provided
    if (dto.contentEntryId) {
      const entry = await this.prisma.contentEntry.findFirst({
        where: {
          id: dto.contentEntryId,
          siteId,
        },
      });
      if (!entry) {
        throw new NotFoundException('Content entry not found');
      }
    }

    // Validate assigned user exists if provided
    // Note: User validation should check org membership, not site membership
    // For now, we'll skip this validation or check org membership
    if (dto.assignedToId) {
      // User belongs to org, not directly to site
      // We can validate user exists, but site-level validation is not needed
    }

    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    return (this.prisma as any).task.create({
      data: {
        siteId,
        createdById: userId,
        ...dto,
      },
      include: {
        contentEntry: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * List tasks with filtering and pagination
   */
  async list(siteId: string, query: TaskQueryDto) {
    const skip = (query.page - 1) * query.pageSize;

    const where: any = {
      siteId,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...(query.contentEntryId && { contentEntryId: query.contentEntryId }),
      ...(query.collectionItemId && { collectionItemId: query.collectionItemId }),
    };

    // Build orderBy
    let orderBy: any = { createdAt: 'desc' };
    if (query.sort) {
      const sortFields: any[] = [];
      query.sort.split(',').forEach((field: string) => {
        const desc = field.startsWith('-');
        const fieldName = desc ? field.slice(1) : field;
        const validFields = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'status'];
        if (validFields.includes(fieldName)) {
          sortFields.push({ [fieldName]: desc ? 'desc' : 'asc' });
        }
      });
      if (sortFields.length > 0) {
        orderBy = sortFields;
      }
    }

    // Use PrismaOptimizationService for select-only query
    const [tasks, total] = await Promise.all([
      this.prismaOptimization.findManyOptimized(
        'task',
        where,
        {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          assignedToId: true,
          createdById: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          contentEntryId: true,
          collectionItemId: true,
        },
        {
          skip,
          take: query.pageSize,
          orderBy,
        },
      ),
      this.prismaOptimization.countOptimized('task', where),
    ]);

    return {
      items: tasks,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  /**
   * Get task by ID
   */
  async getById(siteId: string, taskId: string) {
    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    const task = await (this.prisma as any).task.findFirst({
      where: {
        id: taskId,
        siteId,
      },
      include: {
        contentEntry: {
          select: {
            id: true,
            status: true,
            contentType: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * Update task
   */
  async update(siteId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.getById(siteId, taskId);

    // Validate assigned user exists if provided
    // Note: User belongs to org, not directly to site
    // We can validate user exists, but site-level validation is not needed
    if (dto.assignedToId !== undefined && dto.assignedToId !== null) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: dto.assignedToId,
        },
        select: {
          id: true,
        },
      });
      if (!user) {
        throw new NotFoundException('Assigned user not found');
      }
    }

    // Set completedAt if status is COMPLETED
    const updateData: any = { ...dto };
    if (dto.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (dto.status !== 'COMPLETED' && dto.status !== undefined) {
      updateData.completedAt = null;
    }

    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    return (this.prisma as any).task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        contentEntry: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Delete task
   */
  async delete(siteId: string, taskId: string) {
    await this.getById(siteId, taskId);
    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    await (this.prisma as any).task.delete({
      where: { id: taskId },
    });
  }

  /**
   * Get tasks for a content entry
   */
  async getTasksForContentEntry(siteId: string, contentEntryId: string) {
    return this.prismaOptimization.findManyOptimized(
      'task',
      {
        siteId,
        contentEntryId,
      },
      {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        assignedToId: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }
}

