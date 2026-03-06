import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mailer, SendEmailParams, EmailResult } from '../interfaces/mailer.interface';

type ResendAttachment = {
  filename: string;
  content: string;
  content_type?: string;
};

@Injectable()
export class ResendMailer implements Mailer {
  private readonly logger = new Logger(ResendMailer.name);

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string {
    return (
      this.configService.get<string>('RESEND_API_KEY') ||
      process.env.RESEND_API_KEY ||
      ''
    ).trim();
  }

  private getDefaultFrom(): string {
    return (
      this.configService.get<string>('MAIL_FROM_EMAIL') ||
      process.env.MAIL_FROM_EMAIL ||
      'Net-Flow <no-reply@net-flow.pl>'
    );
  }

  private getDefaultReplyTo(): string | undefined {
    const replyTo =
      this.configService.get<string>('MAIL_REPLY_TO') ||
      process.env.MAIL_REPLY_TO ||
      '';
    return replyTo.trim() || undefined;
  }

  private toArray(value?: string | string[] | null): string[] | undefined {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  }

  private mapAttachments(
    attachments?: SendEmailParams['attachments'],
  ): ResendAttachment[] | undefined {
    if (!attachments?.length) return undefined;
    return attachments.map((attachment) => ({
      filename: attachment.filename,
      content:
        typeof attachment.content === 'string'
          ? attachment.content
          : attachment.content.toString('base64'),
      content_type: attachment.contentType,
    }));
  }

  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is missing');
    }

    const payload = {
      from: params.from || this.getDefaultFrom(),
      to: this.toArray(params.to),
      cc: this.toArray(params.cc),
      bcc: this.toArray(params.bcc),
      reply_to: params.replyTo || this.getDefaultReplyTo(),
      subject: params.subject,
      html: params.body,
      attachments: this.mapAttachments(params.attachments),
      tags: params.metadata
        ? Object.entries(params.metadata)
            .slice(0, 5)
            .map(([name, value]) => ({
              name: String(name),
              value: String(value),
            }))
        : undefined,
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      this.logger.error(
        `Resend send failed (${response.status}): ${responseText}`,
      );
      return {
        id: `mail_${Date.now()}`,
        status: 'failed',
        message: responseText || `HTTP ${response.status}`,
      };
    }

    let externalId = '';
    try {
      const parsed = JSON.parse(responseText) as { id?: string };
      externalId = parsed.id || '';
    } catch {
      externalId = '';
    }

    return {
      id: externalId || `mail_${Date.now()}`,
      externalId: externalId || undefined,
      status: 'sent',
      message: 'Delivered by Resend',
    };
  }

  async sendBulkEmail(params: SendEmailParams[]): Promise<EmailResult[]> {
    return Promise.all(params.map((entry) => this.sendEmail(entry)));
  }
}
