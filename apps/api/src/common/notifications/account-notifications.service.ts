import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mailer } from '../providers/interfaces';
import {
  EmailLocale,
  EmailTemplateService,
  LocalizedText,
  SupportedLanguage,
} from './email-template.service';

type LocaleHints = {
  preferredLanguage?: string | null;
  languageChosenAt?: Date | null;
};

type InviteEmailInput = LocaleHints & {
  to: string;
  organizationName: string;
  siteName?: string | null;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
};

type AccountCreatedEmailInput = LocaleHints & {
  to: string;
  organizationName: string;
  role: string;
  setupUrl: string;
  expiresAt: Date;
};

type PasswordResetEmailInput = LocaleHints & {
  to: string;
  resetUrl: string;
  expiresAt: Date;
};

type PasswordChangedEmailInput = LocaleHints & {
  to: string;
  changedAt: Date;
};

type OnboardingCompletedEmailInput = LocaleHints & {
  to: string;
  firstName?: string | null;
};

@Injectable()
export class AccountNotificationsService {
  private readonly logger = new Logger(AccountNotificationsService.name);

  constructor(
    @Inject('Mailer') private readonly mailer: Mailer,
    private readonly templateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async sendInviteEmail(input: InviteEmailInput): Promise<void> {
    const locale = this.resolveLocale(input);
    const expiration = this.formatDate(input.expiresAt, locale);

    await this.deliver({
      to: input.to,
      category: 'user_invite',
      locale,
      metadata: {
        organization: input.organizationName,
        role: input.role,
      },
      template: {
        locale,
        subject: {
          pl: `Zaproszenie do ${input.organizationName}`,
          en: `Invitation to ${input.organizationName}`,
        },
        preheader: {
          pl: 'Masz nowe zaproszenie do platformy Net-Flow.',
          en: 'You have a new invitation to Net-Flow.',
        },
        heading: {
          pl: 'Zaproszenie do organizacji',
          en: 'Organization invitation',
        },
        intro: {
          pl: `Otrzymales zaproszenie do organizacji ${input.organizationName}${input.siteName ? ` (projekt: ${input.siteName})` : ''}.`,
          en: `You have been invited to ${input.organizationName}${input.siteName ? ` (project: ${input.siteName})` : ''}.`,
        },
        details: [
          {
            label: { pl: 'Rola', en: 'Role' },
            value: input.role,
          },
          {
            label: { pl: 'Wygasa', en: 'Expires' },
            value: expiration,
          },
        ],
        ctaLabel: {
          pl: 'Akceptuj zaproszenie',
          en: 'Accept invitation',
        },
        ctaUrl: input.inviteUrl,
        outro: {
          pl: 'Jesli to nie Twoje zaproszenie, zignoruj ta wiadomosc.',
          en: 'If this was not expected, you can ignore this email.',
        },
        footerNote: {
          pl: 'Wiadomosc wygenerowana automatycznie.',
          en: 'This email was generated automatically.',
        },
      },
    });
  }

  async sendAccountCreatedEmail(input: AccountCreatedEmailInput): Promise<void> {
    const locale = this.resolveLocale(input);
    const expiration = this.formatDate(input.expiresAt, locale);

    await this.deliver({
      to: input.to,
      category: 'user_account_created',
      locale,
      metadata: {
        organization: input.organizationName,
        role: input.role,
      },
      template: {
        locale,
        subject: {
          pl: `Konto utworzone w ${input.organizationName}`,
          en: `Your ${input.organizationName} account is ready`,
        },
        preheader: {
          pl: 'Ustaw haslo i zakoncz konfiguracje konta.',
          en: 'Set your password and finish your account setup.',
        },
        heading: {
          pl: 'Witamy w Net-Flow',
          en: 'Welcome to Net-Flow',
        },
        intro: {
          pl: 'Twoje konto zostalo utworzone przez administratora. Aby aktywowac dostep, ustaw haslo i przejdz onboarding.',
          en: 'Your account was created by an administrator. To activate access, set your password and complete onboarding.',
        },
        details: [
          {
            label: { pl: 'Organizacja', en: 'Organization' },
            value: input.organizationName,
          },
          {
            label: { pl: 'Rola', en: 'Role' },
            value: input.role,
          },
          {
            label: { pl: 'Link wygasa', en: 'Link expires' },
            value: expiration,
          },
        ],
        ctaLabel: {
          pl: 'Ustaw haslo i uruchom konto',
          en: 'Set password and activate account',
        },
        ctaUrl: input.setupUrl,
        outro: {
          pl: 'Po pierwszym logowaniu poprosimy Cie o wybor jezyka i uzupelnienie profilu.',
          en: 'After first login, you will be guided to choose language and complete your profile.',
        },
        footerNote: {
          pl: 'W razie watpliwosci skontaktuj sie z administratorem organizacji.',
          en: 'If needed, contact your organization administrator.',
        },
      },
    });
  }

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const locale = this.resolveLocale(input);
    const expiration = this.formatDate(input.expiresAt, locale);

    await this.deliver({
      to: input.to,
      category: 'auth_password_reset',
      locale,
      template: {
        locale,
        subject: {
          pl: 'Reset hasla do Net-Flow',
          en: 'Reset your Net-Flow password',
        },
        preheader: {
          pl: 'Otrzymalismy prosbe o reset hasla.',
          en: 'We received a request to reset your password.',
        },
        heading: {
          pl: 'Reset hasla',
          en: 'Password reset',
        },
        intro: {
          pl: 'Aby ustawic nowe haslo, kliknij przycisk ponizej.',
          en: 'To set a new password, use the button below.',
        },
        details: [
          {
            label: { pl: 'Link wazny do', en: 'Valid until' },
            value: expiration,
          },
        ],
        ctaLabel: {
          pl: 'Ustaw nowe haslo',
          en: 'Set new password',
        },
        ctaUrl: input.resetUrl,
        outro: {
          pl: 'Jesli nie zglaszales tej prosby, zignoruj ten email.',
          en: 'If you did not request this action, you can ignore this message.',
        },
        footerNote: {
          pl: 'Ze wzgledow bezpieczenstwa link jest jednorazowy.',
          en: 'For security reasons the link is one-time use.',
        },
      },
    });
  }

  async sendPasswordChangedEmail(input: PasswordChangedEmailInput): Promise<void> {
    const locale = this.resolveLocale(input);
    const changedAt = this.formatDate(input.changedAt, locale);

    await this.deliver({
      to: input.to,
      category: 'auth_password_changed',
      locale,
      template: {
        locale,
        subject: {
          pl: 'Haslo zostalo zmienione',
          en: 'Your password was changed',
        },
        heading: {
          pl: 'Potwierdzenie zmiany hasla',
          en: 'Password change confirmation',
        },
        intro: {
          pl: 'Potwierdzamy, ze haslo do Twojego konta zostalo pomyslnie zmienione.',
          en: 'This is a confirmation that your account password was changed successfully.',
        },
        details: [
          {
            label: { pl: 'Data zmiany', en: 'Changed at' },
            value: changedAt,
          },
        ],
        outro: {
          pl: 'Jesli to nie Ty, natychmiast skontaktuj sie z administratorem.',
          en: 'If this was not you, contact your administrator immediately.',
        },
        footerNote: {
          pl: 'Wiadomosc bezpieczenstwa.',
          en: 'Security notification.',
        },
      },
    });
  }

  async sendOnboardingCompletedEmail(
    input: OnboardingCompletedEmailInput,
  ): Promise<void> {
    const locale = this.resolveLocale(input);
    const greetingName = input.firstName?.trim() || '';

    await this.deliver({
      to: input.to,
      category: 'account_onboarding_completed',
      locale,
      template: {
        locale,
        subject: {
          pl: 'Twoje konto jest gotowe',
          en: 'Your account is ready',
        },
        heading: {
          pl: greetingName
            ? `Dziekujemy, ${greetingName}!`
            : 'Dziekujemy!',
          en: greetingName ? `Thank you, ${greetingName}!` : 'Thank you!',
        },
        intro: {
          pl: 'Konfiguracja konta zostala zakonczona. Mozesz teraz korzystac z pelnego panelu.',
          en: 'Your account setup is complete. You can now use the full admin panel.',
        },
        footerNote: {
          pl: 'Milej pracy z Net-Flow.',
          en: 'Have a productive time with Net-Flow.',
        },
      },
    });
  }

  private resolveLocale(hints: LocaleHints): EmailLocale {
    return this.templateService.resolveLocale(
      hints.preferredLanguage,
      hints.languageChosenAt,
    );
  }

  private getFromEmail(): string {
    return (
      this.configService.get<string>('MAIL_FROM_EMAIL') ||
      process.env.MAIL_FROM_EMAIL ||
      'Net-Flow <no-reply@net-flow.pl>'
    );
  }

  private getReplyTo(): string | undefined {
    const replyTo =
      this.configService.get<string>('MAIL_REPLY_TO') ||
      process.env.MAIL_REPLY_TO ||
      '';
    return replyTo.trim() || undefined;
  }

  private async deliver(input: {
    to: string;
    category: string;
    locale: EmailLocale;
    metadata?: Record<string, unknown>;
    template: Parameters<EmailTemplateService['render']>[0];
  }): Promise<void> {
    const rendered = this.templateService.render(input.template);
    const result = await this.mailer.sendEmail({
      to: input.to,
      from: this.getFromEmail(),
      replyTo: this.getReplyTo(),
      subject: rendered.subject,
      body: rendered.body,
      metadata: {
        category: input.category,
        locale: input.locale,
        ...(input.metadata || {}),
      },
    });

    if (result.status === 'failed') {
      const reason = result.message || 'Email delivery failed';
      this.logger.error(`${input.category}: ${reason}`);
      throw new Error(reason);
    }
  }

  private formatDate(value: Date, locale: EmailLocale): string {
    const resolvedLocale: SupportedLanguage =
      locale === 'pl' ? 'pl' : 'en';
    return new Intl.DateTimeFormat(resolvedLocale === 'pl' ? 'pl-PL' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(value);
  }
}
