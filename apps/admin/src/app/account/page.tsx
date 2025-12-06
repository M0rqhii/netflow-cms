"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { Skeleton } from '@repo/ui';
import { getCurrentUser, updateAccountPreferences, changePassword, getBillingInfo, updateBillingInfo } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function AccountPage() {
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
        message: 'Failed to load account data',
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
        message: 'Account preferences updated successfully',
        tone: 'success',
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : 'Failed to update account preferences',
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
        message: 'Passwords do not match',
        tone: 'error',
      });
      return;
    }
    if (newPassword.length < 8) {
      pushToast({
        message: 'Password must be at least 8 characters',
        tone: 'error',
      });
      return;
    }
    try {
      setSaving(true);
      await changePassword({ oldPassword, newPassword });
      pushToast({
        message: 'Password changed successfully',
        tone: 'success',
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : 'Failed to change password',
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
        message: 'Billing information updated successfully',
        tone: 'success',
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : 'Failed to update billing information',
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
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Account</h1>

      <div className="space-y-6">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateAccount} className="space-y-4 max-w-lg">
              <Input
                label="Email Address"
                value={email}
                readOnly
                className="bg-gray-50"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                helperText="Email address cannot be changed"
              />
              <div>
                <label className="block text-sm font-medium mb-1">Preferred Language</label>
                <select
                  className="border rounded-md w-full px-3 py-2 h-10"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value as 'pl' | 'en')}
                  disabled={saving}
                >
                  <option value="en">English</option>
                  <option value="pl">Polski</option>
                </select>
                <p className="text-xs text-muted mt-1">Select your preferred interface language</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              <Input
                label="Current Password"
                type="password"
                value={oldPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                required
                disabled={saving}
                helperText="Enter your current password"
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                required
                minLength={8}
                helperText="Password must be at least 8 characters long"
                disabled={saving}
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                helperText="Re-enter your new password to confirm"
                disabled={saving}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateBillingInfo} className="space-y-4 max-w-lg">
              <Input
                label="Company Name"
                value={companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                disabled={saving}
              />
              <Input
                label="NIP (Tax Identification Number)"
                value={nip}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNip(e.target.value)}
                placeholder="Enter NIP"
                disabled={saving}
                helperText="Polish tax identification number"
              />
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  className="border rounded-md w-full px-3 py-2 min-h-[100px]"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter billing address"
                  rows={3}
                  disabled={saving}
                />
                <p className="text-xs text-muted mt-1">Enter your company's billing address</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
