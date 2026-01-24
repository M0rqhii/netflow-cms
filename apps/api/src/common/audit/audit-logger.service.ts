import { Injectable } from '@nestjs/common';
import { StructuredLoggerService } from '../logging/structured-logger.service';

/**
 * Audit Logger Service
 * AI Note: Separate audit logging for compliance and security
 * 
 * Audit Events:
 * - Content changes (create, update, delete, publish)
 * - Permission changes (role assignments, permission grants)
 * - Authentication events (login, logout, token exchange)
 * - Organization operations (create, update, plan changes)
 */
export enum AuditEventType {
  // Content Events
  CONTENT_CREATED = 'CONTENT_CREATED',
  CONTENT_UPDATED = 'CONTENT_UPDATED',
  CONTENT_DELETED = 'CONTENT_DELETED',
  CONTENT_PUBLISHED = 'CONTENT_PUBLISHED',
  CONTENT_ARCHIVED = 'CONTENT_ARCHIVED',
  
  // Permission Events
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  
  // Authentication Events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  TOKEN_EXCHANGED = 'TOKEN_EXCHANGED',
  
  // Organization Events
  ORG_CREATED = 'ORG_CREATED',
  ORG_UPDATED = 'ORG_UPDATED',
  ORG_PLAN_CHANGED = 'ORG_PLAN_CHANGED',
  
  // Collection Events
  COLLECTION_CREATED = 'COLLECTION_CREATED',
  COLLECTION_UPDATED = 'COLLECTION_UPDATED',
  COLLECTION_DELETED = 'COLLECTION_DELETED',
  
  // Media Events
  MEDIA_UPLOADED = 'MEDIA_UPLOADED',
  MEDIA_DELETED = 'MEDIA_DELETED',
}

export interface AuditMetadata {
  userId?: string;
  orgId?: string;
  siteId?: string;
  resourceId?: string;
  resourceType?: string;
  action?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

@Injectable()
export class AuditLoggerService {
  constructor(private readonly structuredLogger: StructuredLoggerService) {}

  /**
   * Log audit event
   */
  log(event: AuditEventType, metadata: AuditMetadata): void {
    this.structuredLogger.audit(event, {
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log content change
   */
  logContentChange(
    event: AuditEventType.CONTENT_CREATED | AuditEventType.CONTENT_UPDATED | AuditEventType.CONTENT_DELETED | AuditEventType.CONTENT_PUBLISHED | AuditEventType.CONTENT_ARCHIVED,
    metadata: AuditMetadata,
  ): void {
    this.log(event, {
      ...metadata,
      resourceType: 'content',
    });
  }

  /**
   * Log permission change
   */
  logPermissionChange(
    event: AuditEventType.USER_ROLE_CHANGED | AuditEventType.PERMISSION_GRANTED | AuditEventType.PERMISSION_REVOKED,
    metadata: AuditMetadata,
  ): void {
    this.log(event, {
      ...metadata,
      resourceType: 'permission',
    });
  }

  /**
   * Log authentication event
   */
  logAuthEvent(
    event: AuditEventType.LOGIN_SUCCESS | AuditEventType.LOGIN_FAILURE | AuditEventType.LOGOUT | AuditEventType.TOKEN_EXCHANGED,
    metadata: AuditMetadata,
  ): void {
    this.log(event, {
      ...metadata,
      resourceType: 'authentication',
    });
  }

  /**
   * Log organization operation
   */
  logOrgOperation(
    event: AuditEventType.ORG_CREATED | AuditEventType.ORG_UPDATED | AuditEventType.ORG_PLAN_CHANGED,
    metadata: AuditMetadata,
  ): void {
    this.log(event, {
      ...metadata,
      resourceType: 'organization',
    });
  }
}




