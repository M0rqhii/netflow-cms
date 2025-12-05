"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3;
}

export default function NewSitePage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(true);
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoGenerateSlug) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setAutoGenerateSlug(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name || name.length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }

    if (!slug || !isValidSlug(slug)) {
      setError('Slug must be at least 3 characters and contain only lowercase letters, numbers, and hyphens');
      return;
    }

    // Mock submission - just show success message
    alert(`Site "${name}" would be created with slug "${slug}" (UI only - no backend)`);
  };

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create New Site</h1>
        <Link href="/sites">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
            <Input
              label="Site Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              minLength={3}
              placeholder="My Awesome Site"
              helperText="Choose a descriptive name for your site"
            />

            <Input
              label="Slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              minLength={3}
              pattern="[a-z0-9-]+"
              placeholder="my-awesome-site"
              helperText="URL-friendly identifier (lowercase letters, numbers, and hyphens only)"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSlug"
                checked={autoGenerateSlug}
                onChange={(e) => {
                  setAutoGenerateSlug(e.target.checked);
                  if (e.target.checked) {
                    setSlug(slugify(name));
                  }
                }}
                className="w-4 h-4"
              />
              <label htmlFor="autoSlug" className="text-sm text-muted">
                Auto-generate slug from name
              </label>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Site'}
              </Button>
              <Link href="/sites">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
