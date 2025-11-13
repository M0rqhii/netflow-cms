"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function TypesPage() {
  const sp = useSearchParams();
  const tenant = sp.get('tenant');
  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Types {tenant ? `· ${tenant}` : ''}</h1>
        <Link href="/dashboard" className="btn btn-outline">Back to Hub</Link>
      </div>

      <div className="card">
        <div className="card-body">
          <p className="text-muted">Content Types module coming soon. Define and manage content structures.</p>
        </div>
      </div>
    </div>
  );
}

