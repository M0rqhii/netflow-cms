"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function UsersPage() {
  const sp = useSearchParams();
  const tenant = sp.get('tenant');
  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users {tenant ? `· ${tenant}` : ''}</h1>
        <Link href="/dashboard" className="btn btn-outline">Back to Hub</Link>
      </div>

      <div className="card">
        <div className="card-body">
          <p className="text-muted">User management coming soon. Invite and manage members.</p>
        </div>
      </div>
    </div>
  );
}

