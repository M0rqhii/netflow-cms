import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import * as crypto from 'crypto';

/**
 * Workflow Service - handles workflow management and execution
 * AI Note: Manages workflow definitions and state transitions
 * 
 * For MVP, workflows are stored in Tenant.settings.workflows
 * In production, create a dedicated Workflow model in Prisma schema
 */
@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a workflow
   */
  async create(tenantId: string, dto: CreateWorkflowDto) {
    // Validate workflow: must have at least one initial state
    const hasInitialState = dto.states.some((s) => s.initial);
    if (!hasInitialState) {
      throw new BadRequestException('Workflow must have at least one initial state');
    }

    // Validate transitions: all states referenced must exist
    const stateNames = dto.states.map((s) => s.name);
    const invalidTransitions = dto.transitions.filter(
      (t) => !stateNames.includes(t.from) || !stateNames.includes(t.to),
    );
    if (invalidTransitions.length > 0) {
      throw new BadRequestException('Transitions reference non-existent states');
    }

    // For MVP, store workflows in Tenant.settings.workflows
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const settings = (tenant.settings as any) || {};
    const workflows = settings.workflows || [];

    const workflow = {
      id: crypto.randomUUID(),
      ...dto,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    workflows.push(workflow);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...settings,
          workflows,
        },
      },
    });

    return workflow;
  }

  /**
   * Get all workflows for a tenant
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
    return settings.workflows || [];
  }

  /**
   * Get a single workflow by ID
   */
  async findOne(tenantId: string, id: string) {
    const workflows = await this.findAll(tenantId);
    const workflow = workflows.find((w: any) => w.id === id);

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  /**
   * Execute workflow transition
   * AI Note: Transitions content entry or collection item to new state
   */
  async executeTransition(
    tenantId: string,
    workflowId: string,
    entityId: string,
    entityType: 'content' | 'collection',
    transitionName: string,
    userId: string,
  ) {
    const workflow = await this.findOne(tenantId, workflowId);
    const transition = workflow.transitions.find(
      (t: any) => t.from === transitionName || t.label === transitionName,
    );

    if (!transition) {
      throw new BadRequestException(`Transition ${transitionName} not found`);
    }

    // Get current state
    let currentState: string;
    if (entityType === 'content') {
      const entry = await this.prisma.contentEntry.findFirst({
        where: { id: entityId, siteId: tenantId },
      });
      if (!entry) {
        throw new NotFoundException(`Content entry with ID ${entityId} not found`);
      }
      currentState = (entry.data as any)?.workflowState || workflow.states.find((s: any) => s.initial)?.name;
    } else {
      const item = await this.prisma.collectionItem.findFirst({
        where: { id: entityId, siteId: tenantId },
      });
      if (!item) {
        throw new NotFoundException(`Collection item with ID ${entityId} not found`);
      }
      currentState = (item.data as any)?.workflowState || workflow.states.find((s: any) => s.initial)?.name;
    }

    // Validate transition
    if (transition.from !== currentState) {
      throw new BadRequestException(
        `Cannot transition from ${currentState} using transition ${transitionName}`,
      );
    }

    // Execute transition
    const newState = transition.to;
    if (entityType === 'content') {
      await this.prisma.contentEntry.update({
        where: { id: entityId },
        data: {
          data: {
            ...((await this.prisma.contentEntry.findUnique({ where: { id: entityId } }))?.data as any),
            workflowState: newState,
            workflowTransitionedAt: new Date(),
            workflowTransitionedBy: userId,
          },
        },
      });
    } else {
      await this.prisma.collectionItem.update({
        where: { id: entityId },
        data: {
          data: {
            ...((await this.prisma.collectionItem.findUnique({ where: { id: entityId } }))?.data as any),
            workflowState: newState,
            workflowTransitionedAt: new Date(),
            workflowTransitionedBy: userId,
          },
        },
      });
    }

    return {
      success: true,
      from: currentState,
      to: newState,
      transition: transitionName,
    };
  }
}

