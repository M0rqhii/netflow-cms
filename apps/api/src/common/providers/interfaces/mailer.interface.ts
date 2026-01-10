/**
 * Mailer Interface
 * 
 * Abstract interface for email sending providers (Resend, SendGrid, SMTP, etc.)
 * Represents what the platform needs to do, not how specific providers implement it.
 */

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string; // HTML or plain text
  from?: string; // Optional sender email override
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  variables?: Record<string, any>; // Template variables for transactional emails
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  metadata?: Record<string, any>; // Additional metadata for logging/tracking
}

export interface EmailResult {
  id: string; // Internal email ID
  externalId?: string; // Provider-specific email ID
  status: 'sent' | 'failed' | 'pending';
  message?: string;
}

export interface Mailer {
  /**
   * Send a transactional email
   */
  sendEmail(params: SendEmailParams): Promise<EmailResult>;

  /**
   * Send a bulk email (optional, for future use)
   */
  sendBulkEmail?(params: SendEmailParams[]): Promise<EmailResult[]>;
}









