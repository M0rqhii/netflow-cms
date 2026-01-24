import { Injectable, Logger } from '@nestjs/common';

export enum AuditEvent {
  // Authentication
  GLOBAL_LOGIN = 'global.login',
  GLOBAL_LOGOUT = 'global.logout',
  ORG_TOKEN_EXCHANGE = 'org.token.exchange',
  SITE_TOKEN_EXCHANGE = 'site.token.exchange',
  
  // Organization Operations
  ORG_SWITCH = 'org.switch',
  ORG_CREATE = 'org.create',
  ORG_UPDATE = 'org.update',
  ORG_DELETE = 'org.delete',
  
  // User Management
  USER_INVITE = 'user.invite',
  USER_ROLE_CHANGE = 'user.role.change',
  USER_REMOVE = 'user.remove',
  
  // Access
  HUB_ACCESS = 'hub.access',
  SITE_CMS_ACCESS = 'site.cms.access',
}

export interface AuditLogData {
  event: AuditEvent;
  userId: string;
  orgId?: string | null;
  siteId?: string | null;
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
      orgId: data.orgId || null,
      siteId: data.siteId || null,
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
    orgId?: string;
    siteId?: string;
    event?: AuditEvent;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    // Future: Query from database
    // For MVP, return empty array
    return [];
  }
}
