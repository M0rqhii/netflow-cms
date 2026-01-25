"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { Skeleton } from '@repo/ui';
import { getCurrentUser, updateAccountPreferences, changePassword, getBillingInfo, updateBillingInfo } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';

export default function AccountPage() {
  const t = useTranslations();
  const { push: pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'pl' | 'en'>('en');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      const [accountData, billingData] = await Promise.all([
        getCurrentUser(),
        getBillingInfo(),
      ]);

      setEmail(accountData.email || '');
      setPreferredLanguage((accountData.preferredLanguage as 'pl' | 'en') || 'en');
      setCompanyName(billingData.companyName || '');
      setNip(billingData.nip || '');
      setAddress(billingData.address || '');
    } catch (error) {
      pushToast({
        message: t('account.failedToLoadAccountData'),
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateAccountPreferences({ preferredLanguage });
      pushToast({
        message: t('account.accountPreferencesUpdatedSuccessfully'),
        tone: 'success',
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : t('account.failedToUpdateAccountPreferences'),
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      pushToast({
        message: t('account.passwordsDoNotMatch'),
        tone: 'error',
      });
      return;
    }
    if (newPassword.length < 8) {
      pushToast({
        message: t('account.passwordMinLength'),
        tone: 'error',
      });
      return;
    }
    try {
      setSaving(true);
      await changePassword({ oldPassword, newPassword });
      pushToast({
        message: t('account.passwordChangedSuccessfully'),
        tone: 'success',
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : t('account.failedToChangePassword'),
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBillingInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateBillingInfo({ companyName, nip, address });
      pushToast({
        message: t('account.billingInformationUpdatedSuccessfully'),
        tone: 'success',
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : t('account.failedToUpdateBillingInformation'),
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          <Skeleton variant="text" width={200} height={32} />
          <Card>
            <CardContent>
              <Skeleton variant="rectangular" width="100%" height={200} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-0.5 sm:mb-1">
            {t('account.title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Zarządzaj ustawieniami konta i preferencjami
          </p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {/* User Information */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('account.accountSettings')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
              <form onSubmit={handleUpdateAccount} className="space-y-2 w-full max-w-lg">
              <Input
                label={t('account.emailAddress')}
                value={email}
                readOnly
                className="bg-gray-50"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                helperText={t('account.emailCannotBeChanged')}
              />
              <div>
                <label htmlFor="preferred-language" className="block text-sm font-medium mb-1">{t('account.preferredLanguage')}</label>
                <select
                  id="preferred-language"
                  className="border rounded-md w-full px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9 bg-card text-foreground text-xs sm:text-sm"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value as 'pl' | 'en')}
                  disabled={saving}
                  aria-describedby="preferred-language-hint"
                >
                  <option value="en">{t('account.english')}</option>
                  <option value="pl">{t('account.polish')}</option>
                </select>
                <p id="preferred-language-hint" className="text-xs text-muted mt-1">{t('account.selectPreferredLanguage')}</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3">
                  {saving ? t('account.saving') : t('account.saveChanges')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

          {/* Change Password */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('account.changePassword')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
              <form onSubmit={handleChangePassword} className="space-y-2 w-full max-w-lg">
              <Input
                label={t('account.currentPassword')}
                type="password"
                value={oldPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                required
                disabled={saving}
                helperText={t('account.enterCurrentPassword')}
              />
              <Input
                label={t('account.newPassword')}
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                required
                minLength={8}
                helperText={t('account.passwordMinLengthHelper')}
                disabled={saving}
              />
              <Input
                label={t('account.confirmNewPassword')}
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                helperText={t('account.reEnterNewPassword')}
                disabled={saving}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3">
                  {saving ? t('account.changing') : t('account.changePasswordButton')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

          {/* Billing Information */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('account.billingInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
              <form onSubmit={handleUpdateBillingInfo} className="space-y-2 w-full max-w-lg">
              <Input
                label={t('account.companyName')}
                value={companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
                placeholder={t('account.enterCompanyName')}
                disabled={saving}
              />
              <Input
                label={t('account.nip')}
                value={nip}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNip(e.target.value)}
                placeholder={t('account.enterNip')}
                disabled={saving}
                helperText={t('account.nipHelperText')}
              />
              <div>
                <label className="block text-sm font-medium mb-1">{t('account.address')}</label>
                <textarea
                  className="border rounded-md w-full px-2 sm:px-3 py-1.5 sm:py-2 min-h-[80px] sm:min-h-[100px] bg-card text-foreground text-xs sm:text-sm"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('account.enterBillingAddress')}
                  rows={3}
                  disabled={saving}
                />
                <p className="text-xs text-muted mt-1">{t('account.enterCompanyBillingAddress')}</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3">
                  {saving ? t('account.savingBilling') : t('account.saveBillingInfo')}
                </Button>
              </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
