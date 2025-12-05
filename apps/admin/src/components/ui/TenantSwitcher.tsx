"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { fetchMyTenants } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { useTranslations } from '@/hooks/useTranslations';
import { usePathname } from 'next/navigation';
import { useToast } from './Toast';

export default function TenantSwitcher() {
  const t = useTranslations();
  const pathname = usePathname();
  const toast = useToast();
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyTenants();
        setTenants(data);
      } catch (e) {
        // Error will be handled by error state in parent component
        // Don't log here to avoid console noise
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTenantSelect = async (tenant: TenantInfo) => {
    // Redirect to Platform Panel site overview instead of Site Panel
    setIsOpen(false);
    window.location.href = `/sites/${tenant.tenant.slug}`;
  };

  // Extract current site from pathname if in site context (Platform Panel or Site Panel)
  const currentTenantSlug = pathname?.match(/\/(?:sites|tenant)\/([^/]+)/)?.[1];
  const currentTenant = tenants.find(t => t.tenant.slug === currentTenantSlug);

  if (loading || tenants.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline flex items-center gap-2"
        aria-label="Switch tenant"
      >
        <span className="text-sm font-medium">
          {currentTenant ? currentTenant.tenant.name : t('navigation.sites')}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-card border rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {tenants.length === 0 ? (
              <div className="p-3 text-sm text-muted text-center">
                {t('tenants.noTenants')}
              </div>
            ) : (
              <>
                {tenants.map((tenant) => (
                  <button
                    key={tenant.tenantId}
                    onClick={() => handleTenantSelect(tenant)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 transition-colors ${
                      currentTenant?.tenantId === tenant.tenantId ? 'bg-gray-100 font-medium' : ''
                    }`}
                  >
                    <div className="font-medium">{tenant.tenant.name}</div>
                    <div className="text-xs text-muted">{tenant.tenant.slug} · {tenant.role}</div>
                  </button>
                ))}
                <div className="border-t mt-2 pt-2">
                  <Link
                    href="/sites"
                    className="block px-3 py-2 rounded text-sm hover:bg-gray-100 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('dashboard.viewAll')} {t('navigation.sites')}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




