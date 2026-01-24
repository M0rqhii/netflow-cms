"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { acceptInvite, fetchInviteDetails, setAuthToken } from '@/lib/api';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/hooks/useLanguage';

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const router = useRouter();
  const t = useTranslations();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{
    id: string;
    email: string;
    role: string;
    expiresAt: string;
    organization: { id: string; name: string; slug: string };
    site?: { id: string; name: string; slug: string } | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadInvite = async () => {
      if (!token || typeof token !== 'string') {
        setError(t('auth.inviteInvalid'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchInviteDetails(token);
        if (isMounted) {
          setInvite(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : t('auth.inviteInvalid'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInvite();
    return () => {
      isMounted = false;
    };
  }, [token, t]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || typeof token !== 'string') return;

    if (!password || password.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    try {
      setSubmitting(true);
      const res = await acceptInvite(token, password, language || 'en');
      setAuthToken(res.access_token);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.inviteInvalid'));
    } finally {
      setSubmitting(false);
    }
  }, [token, password, confirmPassword, language, router, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Image
            src="/assets/Net-Flow-Logo-Horizontal.png"
            alt="Net-Flow"
            width={200}
            height={32}
            className="h-8 w-auto inline-block"
            priority
          />
        </div>

        <div className="card shadow-lg">
          <div className="card-body p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">{t('auth.inviteTitle')}</h1>
              <p className="text-xs sm:text-sm text-muted">{t('auth.inviteSubtitle')}</p>
            </div>
            <div className="accent-bar mb-6" />

            {loading ? (
              <div className="text-sm text-muted">{t('common.loading')}</div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 rounded" role="alert">
                {error}
              </div>
            ) : invite ? (
              <>
                <div className="space-y-2 text-xs sm:text-sm mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted">{t('auth.inviteOrganization')}</span>
                    <span className="font-medium text-right">{invite.organization?.name}</span>
                  </div>
                  {invite.site?.name && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">{t('auth.inviteSite')}</span>
                      <span className="font-medium text-right">{invite.site.name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted">{t('auth.inviteEmail')}</span>
                    <span className="font-medium text-right">{invite.email}</span>
                  </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4" noValidate>
                  <div>
                    <label htmlFor="invite-password" className="block text-xs sm:text-sm font-medium mb-1">
                      {t('auth.password')}
                      <span className="text-red-500 ml-1" aria-label="required">*</span>
                    </label>
                    <input
                      id="invite-password"
                      type="password"
                      className="border rounded w-full px-3 py-2 text-sm h-10 bg-card text-foreground"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label htmlFor="invite-confirm" className="block text-xs sm:text-sm font-medium mb-1">
                      {t('auth.confirmPassword')}
                      <span className="text-red-500 ml-1" aria-label="required">*</span>
                    </label>
                    <input
                      id="invite-confirm"
                      type="password"
                      className="border rounded w-full px-3 py-2 text-sm h-10 bg-card text-foreground"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full text-xs sm:text-sm" disabled={submitting} aria-busy={submitting}>
                    {submitting ? t('auth.acceptingInvite') : t('auth.acceptInvite')}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-sm text-muted">{t('auth.inviteInvalid')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
