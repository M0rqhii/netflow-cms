import { Injectable, Logger } from '@nestjs/common';

export enum AuditEvent {
  // Authentication
  GLOBAL_LOGIN = 'global.login',
  GLOBAL_LOGOUT = 'global.logout',
  TENANT_TOKEN_EXCHANGE = 'tenant.token.exchange',
  
  // Tenant Operations
  TENANT_SWITCH = 'tenant.switch',
  TENANT_CREATE = 'tenant.create',
  TENANT_UPDATE = 'tenant.update',
  TENANT_DELETE = 'tenant.delete',
  
  // User Management
  USER_INVITE = 'user.invite',
  USER_ROLE_CHANGE = 'user.role.change',
  USER_REMOVE = 'user.remove',
  
  // Access
  HUB_ACCESS = 'hub.access',
  TENANT_CMS_ACCESS = 'tenant.cms.access',
}

export interface AuditLogData {
  event: AuditEvent;
  userId: string;
  tenantId?: string | null;
  metadata?: {
    ip?: string;
    userAgent?: string;
    resourceId?: string;
    changes?: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * Audit Service - logs security and operational events
 * 
 * Note: In production, this should use a dedicated audit log table
 * For MVP, we'll use console logging and can extend to database later
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor() {}

  async log(data: AuditLogData): Promise<void> {
    const logEntry = {
      event: data.event,
      userId: data.userId,
      tenantId: data.tenantId || null,
      metadata: data.metadata || {},
      timestamp: new Date(),
    };

    // Use proper logger instead of console.log
    this.logger.log(JSON.stringify(logEntry));

    // Future: Store in database audit_log table
    // await this.prisma.auditLog.create({ data: logEntry });
  }

  async queryLogs(_filters: {
    userId?: string;
    tenantId?: string;
    event?: AuditEvent;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    // Future: Query from database
    // For MVP, return empty array
    return [];
  }
}
