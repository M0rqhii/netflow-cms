"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { Skeleton } from '@repo/ui';

// Mock data
const mockAccount = {
  email: 'user@example.com',
  preferredLanguage: 'en' as 'pl' | 'en',
};

const mockBillingInfo = {
  companyName: 'Example Company',
  nip: '1234567890',
  address: '123 Main St\nCity, State 12345',
};

export default function AccountPage() {
  const [loading] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<'pl' | 'en'>(mockAccount.preferredLanguage);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState(mockBillingInfo.companyName);
  const [nip, setNip] = useState(mockBillingInfo.nip);
  const [address, setAddress] = useState(mockBillingInfo.address);

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Account preferences would be updated (UI only - no backend)`);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    alert('Password would be changed (UI only - no backend)');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleUpdateBillingInfo = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Billing information would be updated (UI only - no backend)');
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

      {/* User Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateAccount} className="space-y-4 max-w-lg">
            <Input
              label="Email"
              value={mockAccount.email}
              readOnly
              className="bg-gray-50"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
              helperText="Email cannot be changed"
            />
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Language</label>
              <select
                className="border rounded-md w-full px-3 py-2 h-10"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as 'pl' | 'en')}
              >
                <option value="en">English</option>
                <option value="pl">Polski</option>
              </select>
            </div>
            <Button type="submit" variant="primary">Save</Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <Input
              label="Old Password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              helperText="Password must be at least 8 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
            <Button type="submit" variant="primary">Change Password</Button>
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
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
            />
            <Input
              label="NIP"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="NIP"
            />
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                className="border rounded-md w-full px-3 py-2 min-h-[100px]"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                rows={3}
              />
            </div>
            <Button type="submit" variant="primary">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
