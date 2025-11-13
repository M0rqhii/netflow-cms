"use client";

import { useState } from 'react';
import { createApiClient } from '@repo/sdk';
import { setAuthToken } from '@/lib/api';

export default function LoginPage() {
  const api = createApiClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Global login (no tenantId required)
      const res = await api.login(undefined, email, password);
      setAuthToken(res.access_token);
      window.location.href = '/dashboard';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <img src="/assets/Net-Flow-Logo-Horizontal.png" alt="Net-Flow" className="h-8 inline-block" style={{ width: 'auto', height: 'auto' }} />
        </div>
        <div className="card">
          <div className="card-body">
            <h1 className="text-xl font-semibold mb-4">Platform Login</h1>
            <div className="accent-bar mb-4" />
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="border rounded w-full p-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="border rounded w-full p-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-600">{error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <p className="text-sm text-gray-500">Note: No tenant ID required — this is global login</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
