import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SupportedLanguage = 'pl' | 'en';
export type EmailLocale = SupportedLanguage | 'bilingual';

export type LocalizedText = {
  pl: string;
  en: string;
};

export type EmailDetailRow = {
  label: LocalizedText;
  value: string;
};

export type RenderTemplateInput = {
  locale: EmailLocale;
  subject: LocalizedText;
  preheader?: LocalizedText;
  heading: LocalizedText;
  intro: LocalizedText;
  ctaLabel?: LocalizedText;
  ctaUrl?: string;
  details?: EmailDetailRow[];
  outro?: LocalizedText;
  footerNote?: LocalizedText;
};

@Injectable()
export class EmailTemplateService {
  constructor(private readonly configService: ConfigService) {}

  resolveLocale(
    preferredLanguage?: string | null,
    languageChosenAt?: Date | null,
  ): EmailLocale {
    const normalized = String(preferredLanguage || '').toLowerCase();
    if (languageChosenAt && (normalized === 'pl' || normalized === 'en')) {
      return normalized;
    }
    return 'bilingual';
  }

  render(input: RenderTemplateInput): { subject: string; body: string } {
    const locale = input.locale;
    const subject = this.pickText(locale, input.subject);
    const preheader = input.preheader
      ? this.pickText(locale, input.preheader)
      : '';
    const brandName = this.escapeHtml(this.getBrandName());
    const logoUrl = this.safeUrl(this.getLogoUrl());
    const supportEmail = this.escapeHtml(this.getSupportEmail());
    const renderedCtaUrl = this.safeUrl(input.ctaUrl);

    const content =
      locale === 'bilingual'
        ? `${this.renderLanguageSection(
            'PL',
            input.heading.pl,
            input.intro.pl,
            input.details,
            'pl',
            input.outro?.pl,
            input.ctaLabel?.pl,
            renderedCtaUrl,
          )}
          ${this.renderLanguageSection(
            'EN',
            input.heading.en,
            input.intro.en,
            input.details,
            'en',
            input.outro?.en,
            input.ctaLabel?.en,
            renderedCtaUrl,
          )}`
        : this.renderLanguageSection(
            locale.toUpperCase(),
            locale === 'pl' ? input.heading.pl : input.heading.en,
            locale === 'pl' ? input.intro.pl : input.intro.en,
            input.details,
            locale,
            locale === 'pl' ? input.outro?.pl : input.outro?.en,
            locale === 'pl' ? input.ctaLabel?.pl : input.ctaLabel?.en,
            renderedCtaUrl,
          );

    const footerNote = input.footerNote
      ? this.escapeHtml(this.pickText(locale, input.footerNote))
      : '';

    return {
      subject,
      body: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif;color:#112138;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      ${this.escapeHtml(preheader || subject)}
    </span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#f3f6fb;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dde6f3;">
            <tr>
              <td style="padding:22px 26px;background:linear-gradient(135deg,#0f2e59,#1956a3);color:#ffffff;">
                ${
                  logoUrl
                    ? `<img src="${logoUrl}" alt="${brandName}" style="max-height:34px;display:block;" />`
                    : `<div style="font-size:22px;font-weight:700;letter-spacing:0.4px;">${brandName}</div>`
                }
                <div style="margin-top:10px;font-size:12px;opacity:0.9;">
                  Transactional notification
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 26px;border-top:1px solid #e5ebf5;background:#f9fbff;color:#4f6077;font-size:12px;line-height:1.55;">
                ${footerNote ? `<div style="margin-bottom:6px;">${footerNote}</div>` : ''}
                <div>${brandName} · ${supportEmail}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    };
  }

  private renderLanguageSection(
    languageBadge: string,
    heading: string,
    intro: string,
    details: EmailDetailRow[] | undefined,
    language: SupportedLanguage,
    outro?: string,
    ctaLabel?: string,
    ctaUrl?: string,
  ): string {
    const resolvedDetails = (details || [])
      .map((row) => {
        const label = language === 'pl' ? row.label.pl : row.label.en;
        return `<tr>
  <td style="padding:4px 0;color:#63748a;font-size:13px;">${this.escapeHtml(label)}</td>
  <td style="padding:4px 0;color:#10233b;font-size:13px;font-weight:600;text-align:right;">${this.escapeHtml(row.value)}</td>
</tr>`;
      })
      .join('');

    return `<div style="margin-bottom:18px;border:1px solid #e5ebf5;border-radius:12px;padding:18px;background:#fcfdff;">
  <div style="display:inline-block;background:#eef3ff;color:#2a4670;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;margin-bottom:10px;">
    ${this.escapeHtml(languageBadge)}
  </div>
  <h1 style="margin:0 0 10px;font-size:21px;line-height:1.25;color:#0e2239;">${this.escapeHtml(
    heading,
  )}</h1>
  <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#31465f;">${this.escapeHtml(
    intro,
  )}</p>
  ${
    resolvedDetails
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;">${resolvedDetails}</table>`
      : ''
  }
  ${
    ctaLabel && ctaUrl
      ? `<div style="margin:14px 0 2px;"><a href="${ctaUrl}" style="display:inline-block;background:#1376e6;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:10px;">${this.escapeHtml(
          ctaLabel,
        )}</a></div>`
      : ''
  }
  ${
    outro
      ? `<p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#4a5f79;">${this.escapeHtml(
          outro,
        )}</p>`
      : ''
  }
</div>`;
  }

  private pickText(locale: EmailLocale, text: LocalizedText): string {
    if (locale === 'pl') return text.pl;
    if (locale === 'en') return text.en;
    return `${text.pl} / ${text.en}`;
  }

  private getBrandName(): string {
    return (
      this.configService.get<string>('MAIL_BRAND_NAME') ||
      this.configService.get<string>('APP_NAME') ||
      'Net-Flow'
    );
  }

  private getLogoUrl(): string {
    const explicit = this.configService.get<string>('MAIL_BRAND_LOGO_URL');
    if (explicit?.trim()) return explicit.trim();

    const frontend =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';
    return `${frontend.replace(/\/$/, '')}/assets/Net-Flow-Logo-Horizontal.png`;
  }

  private getSupportEmail(): string {
    return (
      this.configService.get<string>('MAIL_SUPPORT_EMAIL') ||
      this.configService.get<string>('MAIL_REPLY_TO') ||
      'support@net-flow.pl'
    );
  }

  private safeUrl(value?: string): string {
    if (!value) return '';
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return '';
      }
      return this.escapeHtml(url.toString());
    } catch {
      return '';
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
