"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function MediaPage() {
  const sp = useSearchParams();
  const tenant = sp.get('tenant');
  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Media {tenant ? `· ${tenant}` : ''}</h1>
        <Link href="/dashboard" className="btn btn-outline">Back to Hub</Link>
      </div>

      <div className="card">
        <div className="card-body">
          <p className="text-muted">Media library coming soon. Upload and manage files.</p>
        </div>
      </div>
    </div>
  );
}

