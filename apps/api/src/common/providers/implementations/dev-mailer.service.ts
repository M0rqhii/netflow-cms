import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Mailer, SendEmailParams, EmailResult } from '../interfaces/mailer.interface';

/**
 * DevMailer
 * 
 * Development-only implementation that logs emails to the database
 * instead of sending them via external services.
 */
@Injectable()
export class DevMailer implements Mailer {
  private readonly logger = new Logger(DevMailer.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    const to = Array.isArray(params.to) ? params.to.join(', ') : params.to;
    this.logger.log(`[DEV] Sending email to: ${to}, subject: ${params.subject}`);

    // Store email in DevEmailLog table for observability
    try {
      const emailLog = await this.prisma.devEmailLog.create({
        data: {
          to: to,
          subject: params.subject,
          body: params.body,
          from: params.from || 'dev@netflow-cms.local',
          replyTo: params.replyTo || null,
          cc: params.cc ? (Array.isArray(params.cc) ? params.cc.join(', ') : params.cc) : null,
          bcc: params.bcc ? (Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc) : null,
          variables: params.variables || {},
          metadata: params.metadata || {},
          status: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.log(`[DEV] Email logged to database with ID: ${emailLog.id}`);

      return {
        id: emailLog.id,
        status: 'sent',
        message: 'Email logged to DevEmailLog (dev mode)',
      };
    } catch (error) {
      // If DevEmailLog table doesn't exist yet, just log to console
      this.logger.warn(`[DEV] DevEmailLog table not available, logging to console only`);
      this.logger.log(`[DEV EMAIL] To: ${to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${params.subject}`);
      this.logger.log(`[DEV EMAIL] Body: ${params.body.substring(0, 200)}...`);

      return {
        id: `dev_email_${Date.now()}`,
        status: 'sent',
        message: 'Email logged to console (dev mode)',
      };
    }
  }

  async sendBulkEmail(params: SendEmailParams[]): Promise<EmailResult[]> {
    this.logger.log(`[DEV] Sending bulk email to ${params.length} recipients`);
    return Promise.all(params.map((p) => this.sendEmail(p)));
  }
}









