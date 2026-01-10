import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RbacService } from './rbac.service';
import { RbacEvaluatorService } from './rbac-evaluator.service';
import {
  createRoleSchema,
  updateRoleSchema,
  createAssignmentSchema,
  updatePolicySchema,
} from './dto';

/**
 * RBAC Controller
 * 
 * Endpoints for managing roles, assignments, and policies.
 * 
 * Authorization:
 * - Owner: can do everything
 * - Org Admin: can do RBAC in SITE/technical scope, but not billing
 * - Others: based on specific capabilities
 */
@UseGuards(AuthGuard)
@Controller('orgs/:orgId/rbac')
export class RbacController {
  constructor(
    private readonly rbacService: RbacService,
    private readonly rbacEvaluatorService: RbacEvaluatorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /orgs/:orgId/rbac/users
   * Get all users who are members of this organization
   */
  @Get('users')
  async getOrgUsers(@CurrentOrg() orgId: string) {
    // Get users via UserOrg membership
    const memberships = await this.prisma.userOrg.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            siteRole: true,
            platformRole: true,
            createdAt: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      role: m.role,
      siteRole: m.user.siteRole,
      platformRole: m.user.platformRole,
      createdAt: m.user.createdAt.toISOString(),
    }));
  }

  /**
   * GET /orgs/:orgId/rbac/capabilities
   * Get all capabilities with policy status
   */
  @Get('capabilities')
  async getCapabilities(@CurrentOrg() orgId: string) {
    // Anyone in org can view capabilities
    return this.rbacService.getCapabilities(orgId);
  }

  /**
   * GET /orgs/:orgId/rbac/roles?scope=ORG|SITE
   * Get roles (system + custom) with optional scope filter
   */
  @Get('roles')
  async getRoles(
    @CurrentOrg() orgId: string,
    @Query('scope') scope?: 'ORG' | 'SITE',
  ) {
    // Anyone in org can view roles
    return this.rbacService.getRoles(orgId, scope);
  }

  /**
   * POST /orgs/:orgId/rbac/roles
   * Create custom role
   */
  @Post('roles')
  async createRole(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createRoleSchema)) dto: unknown,
  ) {
    // Check authorization: Owner or Org Admin with org.roles.manage
    await this.checkCanManageRoles(orgId, user.id);

    return this.rbacService.createRole(orgId, dto as any, user.id);
  }

  /**
   * PATCH /orgs/:orgId/rbac/roles/:roleId
   * Update custom role
   */
  @Patch('roles/:roleId')
  async updateRole(
    @CurrentOrg() orgId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(updateRoleSchema)) dto: unknown,
  ) {
    // Check authorization: Owner or Org Admin with org.roles.manage
    await this.checkCanManageRoles(orgId, user.id);

    return this.rbacService.updateRole(orgId, roleId, dto as any, user.id);
  }

  /**
   * DELETE /orgs/:orgId/rbac/roles/:roleId?force=true
   * Delete custom role
   */
  @Delete('roles/:roleId')
  @HttpCode(HttpStatus.OK)
  async deleteRole(
    @CurrentOrg() orgId: string,
    @Param('roleId') roleId: string,
    @Query('force') force?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    // Check authorization: Owner or Org Admin with org.roles.manage
    if (user) {
      await this.checkCanManageRoles(orgId, user.id);
    }

    const forceDelete = force === 'true';
    return this.rbacService.deleteRole(orgId, roleId, forceDelete);
  }

  /**
   * GET /orgs/:orgId/rbac/assignments?userId=&siteId=
   * Get assignments
   */
  @Get('assignments')
  async getAssignments(
    @CurrentOrg() orgId: string,
    @Query('userId') userId?: string,
    @Query('siteId') siteId?: string,
  ) {
    // Anyone in org can view assignments (filtered by orgId)
    const siteIdParam = siteId === 'null' || siteId === '' ? undefined : siteId;
    return this.rbacService.getAssignments(orgId, userId, siteIdParam);
  }

  /**
   * POST /orgs/:orgId/rbac/assignments
   * Create assignment
   */
  @Post('assignments')
  async createAssignment(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createAssignmentSchema)) dto: unknown,
  ) {
    // Check authorization based on scope:
    // - ORG scope: need org.roles.manage or Owner
    // - SITE scope: need builder.site_roles.manage or Owner
    const assignmentDto = dto as any;
    const role = await this.rbacService.getRoles(orgId);
    const targetRole = role.find(r => r.id === assignmentDto.roleId);
    
    if (!targetRole) {
      throw new ForbiddenException('Role not found');
    }

    if (targetRole.scope === 'ORG') {
      await this.checkCanManageRoles(orgId, user.id);
    } else if (targetRole.scope === 'SITE') {
      await this.checkCanManageSiteRoles(orgId, user.id, assignmentDto.siteId);
    }

    return this.rbacService.createAssignment(orgId, assignmentDto, user.id);
  }

  /**
   * DELETE /orgs/:orgId/rbac/assignments/:assignmentId
   * Delete assignment
   */
  @Delete('assignments/:assignmentId')
  @HttpCode(HttpStatus.OK)
  async deleteAssignment(
    @CurrentOrg() orgId: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Get assignment to check scope
    const assignments = await this.rbacService.getAssignments(orgId);
    const assignment = assignments.find(a => a.id === assignmentId);

    if (!assignment) {
      throw new ForbiddenException('Assignment not found');
    }

    // Check authorization based on scope
    if (assignment.role.scope === 'ORG') {
      await this.checkCanManageRoles(orgId, user.id);
    } else if (assignment.role.scope === 'SITE') {
      await this.checkCanManageSiteRoles(orgId, user.id, assignment.siteId || undefined);
    }

    return this.rbacService.deleteAssignment(orgId, assignmentId);
  }

  /**
   * GET /orgs/:orgId/rbac/policies
   * Get policies
   */
  @Get('policies')
  async getPolicies(@CurrentOrg() orgId: string) {
    // Anyone in org can view policies
    return this.rbacService.getPolicies(orgId);
  }

  /**
   * GET /orgs/:orgId/rbac/effective?siteId=
   * Get effective capabilities for the current user
   */
  @Get('effective')
  async getEffectiveCapabilities(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('siteId') siteId?: string,
  ) {
    const resolvedSiteId = siteId === 'null' || siteId === '' ? undefined : siteId;
    return this.rbacEvaluatorService.getEffectiveCapabilities({
      orgId,
      userId: user.id,
      siteId: resolvedSiteId,
    });
  }

  /**
   * PUT /orgs/:orgId/rbac/policies/:capabilityKey
   * Update policy
   */
  @Put('policies/:capabilityKey')
  async updatePolicy(
    @CurrentOrg() orgId: string,
    @Param('capabilityKey') capabilityKey: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(updatePolicySchema)) dto: unknown,
  ) {
    // Check authorization: Owner always, Org Admin only if Owner enabled org.policies.manage
    await this.checkCanManagePolicies(orgId, user.id);

    return this.rbacService.updatePolicy(orgId, capabilityKey, dto as any, user.id);
  }

  /**
   * Helper: Check if user can manage roles
   */
  private async checkCanManageRoles(orgId: string, userId: string): Promise<void> {
    // Owner can always manage roles
    const isOwner = await this.isOwner(orgId, userId);
    if (isOwner) {
      return;
    }

    // Check if user has org.roles.manage capability
    const canManage = await this.rbacService.canUserPerform(
      orgId,
      userId,
      'org.roles.manage',
    );

    if (!canManage) {
      throw new ForbiddenException('You do not have permission to manage roles');
    }
  }

  /**
   * Helper: Check if user can manage site roles
   */
  private async checkCanManageSiteRoles(
    orgId: string,
    userId: string,
    siteId?: string,
  ): Promise<void> {
    // Owner can always manage site roles
    const isOwner = await this.isOwner(orgId, userId);
    if (isOwner) {
      return;
    }

    // Check if user has builder.site_roles.manage capability
    const canManage = await this.rbacService.canUserPerform(
      orgId,
      userId,
      'builder.site_roles.manage',
      siteId,
    );

    if (!canManage) {
      throw new ForbiddenException('You do not have permission to manage site roles');
    }
  }

  /**
   * Helper: Check if user can manage policies
   */
  private async checkCanManagePolicies(orgId: string, userId: string): Promise<void> {
    // Owner can always manage policies
    const isOwner = await this.isOwner(orgId, userId);
    if (isOwner) {
      return;
    }

    // Org Admin can manage policies only if Owner enabled org.policies.manage
    const canManage = await this.rbacService.canUserPerform(
      orgId,
      userId,
      'org.policies.manage',
    );

    if (!canManage) {
      throw new ForbiddenException('You do not have permission to manage policies');
    }
  }

  /**
   * Helper: Check if user is Owner
   * Checks if user has Owner role (system role) or is super admin
   */
  private async isOwner(orgId: string, userId: string): Promise<boolean> {
    // Get user to check system role
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        orgId: orgId,
      },
      select: {
        isSuperAdmin: true,
        systemRole: true,
        platformRole: true,
      },
    });

    if (!user) {
      return false;
    }

    // Super admin is always owner
    if (user.isSuperAdmin || user.systemRole === 'super_admin') {
      return true;
    }

    // Check if user has Owner role in org
    const assignments = await this.rbacService.getAssignments(orgId, userId);
    const hasOwnerRole = assignments.some(
      a => a.role.name === 'Org Owner' && a.role.type === 'SYSTEM' && a.role.scope === 'ORG'
    );

    return hasOwnerRole;
  }
}

