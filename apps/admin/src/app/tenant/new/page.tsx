"use client";

import Link from 'next/link';
import { useState } from 'react';
import { createTenant } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function NewTenantPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const t = await createTenant(name, slug);
      push({ tone: 'success', title: 'Tenant created', message: `${t.name}` });
      window.location.href = `/tenant/${t.slug}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Tenant</h1>
        <Link href="/dashboard" className="btn btn-outline">Cancel</Link>
      </div>
      <div className="card">
        <div className="card-body">
          <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input className="border rounded w-full p-2" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input className="border rounded w-full p-2" value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
            {error && <p className="text-red-600">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
  const { push } = useToast();
