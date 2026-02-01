import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CurrentSite } from '../../common/decorators/current-site.decorator';
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
} from './dto';

/**
 * Site RBAC Controller
 * 
 * Endpoints for managing SITE-level roles and assignments.
 * 
 * IMPORTANT:
 * - Site can ONLY manage SITE scope roles, NOT ORG scope roles
 * - Site cannot access org-level RBAC data
 * - Org can manage both ORG and SITE scope roles (via org-rbac.controller)
 * 
 * Authorization:
 * - Requires builder.site_roles.manage capability or Owner role
 */
@UseGuards(AuthGuard)
@Controller('sites/:siteId/rbac')
export class SiteRbacController {
  constructor(
    private readonly rbacService: RbacService,
    private readonly rbacEvaluatorService: RbacEvaluatorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /sites/:siteId/rbac/roles
   * Get SITE scope roles only (Site cannot see ORG scope roles)
   */
  @Get('roles')
  async getSiteRoles(
    @CurrentSite() _siteId: string,
    @CurrentOrg() orgId: string,
  ) {
    // Site can only see SITE scope roles
    return this.rbacService.getRoles(orgId, 'SITE');
  }

  /**
   * POST /sites/:siteId/rbac/roles
   * Create SITE scope custom role
   * Site CANNOT create ORG scope roles
   */
  @Post('roles')
  async createSiteRole(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createRoleSchema)) dto: any,
  ) {
    const roleDto = dto as any;
    
    // Site can ONLY create SITE scope roles
    if (roleDto.scope !== 'SITE') {
      throw new ForbiddenException('Site can only create SITE scope roles. Use org endpoint for ORG scope roles.');
    }

    // Check authorization: Owner or user with builder.site_roles.manage
    await this.checkCanManageSiteRoles(orgId, user.id, siteId);

    // Create role with SITE scope
    return this.rbacService.createRole(orgId, { ...roleDto, scope: 'SITE' }, user.id);
  }

  /**
   * PATCH /sites/:siteId/rbac/roles/:roleId
   * Update SITE scope custom role
   * Site CANNOT update ORG scope roles
   */
  @Patch('roles/:roleId')
  async updateSiteRole(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(updateRoleSchema)) dto: any,
  ) {
    // Verify role exists and is SITE scope
    const roles = await this.rbacService.getRoles(orgId, 'SITE');
    const role = roles.find(r => r.id === roleId);
    
    if (!role) {
      throw new ForbiddenException('Role not found or is not SITE scope');
    }

    // Site cannot update ORG scope roles
    if (role.scope !== 'SITE') {
      throw new ForbiddenException('Site can only update SITE scope roles');
    }

    // Check authorization
    await this.checkCanManageSiteRoles(orgId, user.id, siteId);

    return this.rbacService.updateRole(orgId, roleId, dto as any, user.id);
  }

  /**
   * DELETE /sites/:siteId/rbac/roles/:roleId?force=true
   * Delete SITE scope custom role
   * Site CANNOT delete ORG scope roles
   */
  @Delete('roles/:roleId')
  @HttpCode(HttpStatus.OK)
  async deleteSiteRole(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('roleId') roleId: string,
    @Query('force') force?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    // Verify role exists and is SITE scope
    const roles = await this.rbacService.getRoles(orgId, 'SITE');
    const role = roles.find(r => r.id === roleId);
    
    if (!role) {
      throw new ForbiddenException('Role not found or is not SITE scope');
    }

    // Site cannot delete ORG scope roles
    if (role.scope !== 'SITE') {
      throw new ForbiddenException('Site can only delete SITE scope roles');
    }

    // Check authorization
    if (user) {
      await this.checkCanManageSiteRoles(orgId, user.id, siteId);
    }

    const forceDelete = force === 'true';
    return this.rbacService.deleteRole(orgId, roleId, forceDelete);
  }

  /**
   * GET /sites/:siteId/rbac/assignments?userId=
   * Get SITE scope assignments for this site
   * Site CANNOT see ORG scope assignments
   */
  @Get('assignments')
  async getSiteAssignments(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Query('userId') userId?: string,
  ) {
    // Site can only see assignments for this site (SITE scope)
    return this.rbacService.getAssignments(orgId, userId, siteId);
  }

  /**
   * POST /sites/:siteId/rbac/assignments
   * Assign SITE scope role to user for this site
   * Site CANNOT assign ORG scope roles
   */
  @Post('assignments')
  async createSiteAssignment(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createAssignmentSchema)) dto: any,
  ) {
    const assignmentDto = dto as any;
    
    // Verify role exists and is SITE scope
    const roles = await this.rbacService.getRoles(orgId, 'SITE');
    const targetRole = roles.find(r => r.id === assignmentDto.roleId);
    
    if (!targetRole) {
      throw new ForbiddenException('Role not found or is not SITE scope');
    }

    // Site can only assign SITE scope roles
    if (targetRole.scope !== 'SITE') {
      throw new ForbiddenException('Site can only assign SITE scope roles');
    }

    // Check authorization
    await this.checkCanManageSiteRoles(orgId, user.id, siteId);

    // Force siteId to current site
    return this.rbacService.createAssignment(orgId, {
      ...assignmentDto,
      siteId, // Force siteId to current site
    }, user.id);
  }

  /**
   * DELETE /sites/:siteId/rbac/assignments/:assignmentId
   * Remove SITE scope assignment
   * Site CANNOT remove ORG scope assignments
   */
  @Delete('assignments/:assignmentId')
  @HttpCode(HttpStatus.OK)
  async deleteSiteAssignment(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Get assignment to verify it's for this site and SITE scope
    const assignments = await this.rbacService.getAssignments(orgId, undefined, siteId);
    const assignment = assignments.find(a => a.id === assignmentId);

    if (!assignment) {
      throw new ForbiddenException('Assignment not found or is not for this site');
    }

    // Site can only remove SITE scope assignments
    if (assignment.role.scope !== 'SITE') {
      throw new ForbiddenException('Site can only remove SITE scope assignments');
    }

    // Check authorization
    await this.checkCanManageSiteRoles(orgId, user.id, siteId);

    return this.rbacService.deleteAssignment(orgId, assignmentId);
  }

  /**
   * GET /sites/:siteId/rbac/effective
   * Get effective capabilities for current user in this site
   */
  @Get('effective')
  async getEffectiveCapabilities(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.rbacEvaluatorService.getEffectiveCapabilities({
      orgId,
      userId: user.id,
      siteId,
    });
  }

  /**
   * Helper: Check if user can manage site roles
   */
  private async checkCanManageSiteRoles(
    orgId: string,
    userId: string,
    siteId: string,
  ): Promise<void> {
    // Owner can always manage site roles
    const isOwner = await this.isOwner(orgId, userId);
    if (isOwner) {
      return;
    }

    // Check if user has builder.site_roles.manage capability for this site
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
   * Helper: Check if user is Owner
   */
  private async isOwner(orgId: string, userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        orgId,
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
