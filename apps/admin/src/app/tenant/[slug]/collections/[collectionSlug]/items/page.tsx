"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { fetchMyTenants, getCollection, fetchCollectionItems, createCollectionItem, updateCollectionItem, deleteCollectionItem, type CollectionItem } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { canEditContent } from '@/lib/rbac';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SearchAndFilters from '@/components/ui/SearchAndFilters';
import EmptyState from '@/components/ui/EmptyState';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import DynamicForm from '@/components/content/DynamicForm';
import { simpleSchemaToFields } from '@/lib/schema-converter';
import type { FieldDefinition } from '@/components/content/FieldsEditor';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';

export default function CollectionItemsPage() {
  const t = useTranslations();
  const params = useParams<{ slug: string; collectionSlug: string }>();
  const slug = params?.slug as string;
  const collectionSlug = params?.collectionSlug as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<'DRAFT' | 'PUBLISHED' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<CollectionItem | null>(null);
  const [itemData, setItemData] = useState<Record<string, unknown>>({});
  const [itemStatus, setItemStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [saving, setSaving] = useState(false);
  const [collectionSchema, setCollectionSchema] = useState<Record<string, unknown> | null>(null);
  const [collectionFields, setCollectionFields] = useState<FieldDefinition[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; itemId: string; itemName: string }>({ open: false, itemId: '', itemName: '' });
  const { push } = useToast();

  const loadItems = useCallback(async (tenantId: string) => {
    try {
      const response = await fetchCollectionItems(tenantId, collectionSlug, {
        page,
        pageSize,
        status: statusFilter || undefined,
        sort: '-createdAt',
      });
      setItems(response.items);
      setTotal(response.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
    }
  }, [collectionSlug, page, pageSize, statusFilter]);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyTenants();
        const tenant = list.find((x) => x.tenant.slug === slug) || null;
        if (!tenant) throw new Error('Tenant not found');
        setTenant(tenant);
        
        // Get collection schema
        const collection = await getCollection(tenant.tenantId, collectionSlug);
        const schema = collection.schemaJson as Record<string, unknown> || {};
        setCollectionSchema(schema);
        
        // Convert schema to fields for dynamic form
        const fields = simpleSchemaToFields(schema);
        setCollectionFields(fields);
        
        await loadItems(tenant.tenantId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load items');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, collectionSlug, loadItems]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    collectionFields.forEach(field => {
      if (field.required && (itemData[field.name] === undefined || itemData[field.name] === null || itemData[field.name] === '')) {
        errors[field.name] = `${field.name} is required`;
      }
      
      if (field.type === 'number' && itemData[field.name] !== undefined && itemData[field.name] !== null && itemData[field.name] !== '') {
        const num = Number(itemData[field.name]);
        if (isNaN(num)) {
          errors[field.name] = `${field.name} must be a number`;
        } else {
          if (field.min !== undefined && num < field.min) {
            errors[field.name] = `${field.name} must be at least ${field.min}`;
          }
          if (field.max !== undefined && num > field.max) {
            errors[field.name] = `${field.name} must be at most ${field.max}`;
          }
        }
      }
      
      if (field.type === 'text' && itemData[field.name] !== undefined && itemData[field.name] !== null) {
        const str = String(itemData[field.name]);
        if (field.minLength !== undefined && str.length < field.minLength) {
          errors[field.name] = `${field.name} must be at least ${field.minLength} characters`;
        }
        if (field.maxLength !== undefined && str.length > field.maxLength) {
          errors[field.name] = `${field.name} must be at most ${field.maxLength} characters`;
        }
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    if (!validateForm()) {
      push({ tone: 'error', message: 'Please fix validation errors' });
      return;
    }
    
    setSaving(true);
    try {
      await createCollectionItem(tenant.tenantId, collectionSlug, {
        data: itemData,
        status: itemStatus,
      });
      setOpen(false);
      setItemData({});
      setItemStatus('DRAFT');
      setFormErrors({});
      await loadItems(tenant.tenantId);
      push({ tone: 'success', message: 'Item created' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to create' });
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editItem) return;
    
    if (!validateForm()) {
      push({ tone: 'error', message: 'Please fix validation errors' });
      return;
    }
    
    setSaving(true);
    try {
      await updateCollectionItem(tenant.tenantId, collectionSlug, editItem.id, {
        data: itemData,
        status: itemStatus,
        version: editItem.version,
      });
      setEditItem(null);
      setItemData({});
      setItemStatus('DRAFT');
      setFormErrors({});
      await loadItems(tenant.tenantId);
      push({ tone: 'success', message: 'Item updated' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (itemId: string) => {
    if (!tenant) return;
    const item = items.find(i => i.id === itemId);
    const itemName = item ? JSON.stringify(item.data).substring(0, 50) : 'this item';
    setDeleteConfirm({ open: true, itemId, itemName });
  };

  const confirmDelete = async () => {
    if (!tenant) return;
    try {
      await deleteCollectionItem(tenant.tenantId, collectionSlug, deleteConfirm.itemId);
      await loadItems(tenant.tenantId);
      push({ tone: 'success', message: 'Item deleted' });
      setDeleteConfirm({ open: false, itemId: '', itemName: '' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete' });
    }
  };

  const renderField = (key: string, value: unknown) => {
    if (value === null || value === undefined) return <span className="text-muted">—</span>;
    if (typeof value === 'object') {
      return <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-w-xs">{JSON.stringify(value, null, 2)}</pre>;
    }
    return <span>{String(value)}</span>;
  };

  // Filter items based on search
  const filteredItems = searchQuery
    ? items.filter(item => {
        const query = searchQuery.toLowerCase();
        return Object.values(item.data).some(value => 
          String(value).toLowerCase().includes(query)
        ) || item.status.toLowerCase().includes(query);
      })
    : items;

  return (
    <div className="container py-8">
      <Breadcrumbs
        items={[
          { label: t('dashboard.title'), href: '/dashboard' },
          { label: tenant?.tenant.name || slug, href: `/tenant/${slug}` },
          { label: t('navigation.collections'), href: `/tenant/${slug}/collections` },
          { label: collectionSlug, href: `/tenant/${slug}/collections/${collectionSlug}` },
          { label: 'Items' },
        ]}
      />
      
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Items · {collectionSlug}</h1>
        <div className="flex items-center gap-2">
          {tenant && canEditContent(tenant.role) && (
            <button className="btn btn-primary" onClick={() => { setOpen(true); setItemData({}); setItemStatus('DRAFT'); }}>
              New Item
            </button>
          )}
          <Link href={`/tenant/${encodeURIComponent(slug)}/collections`} className="btn btn-outline">Back</Link>
        </div>
      </div>

      {/* Search and Filters */}
      {!loading && items.length > 0 && (
        <SearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              options: [
                { value: '', label: 'All' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Published' },
              ],
              onChange: (value) => { setStatusFilter(value as 'DRAFT' | 'PUBLISHED' | ''); setPage(1); },
            },
          ]}
          placeholder="Search items..."
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="skeleton h-5 w-40 mb-2" />
                <div className="skeleton h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <EmptyState
          title={`Nie masz jeszcze elementów w kolekcji "${collectionSlug}"`}
          message="Kliknij tutaj, żeby dodać pierwszy element"
          actionLabel="New Item"
          onActionClick={() => { setOpen(true); setItemData({}); setItemStatus('DRAFT'); }}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="Nie znaleziono elementów"
          message={`Brak elementów pasujących do wyszukiwania "${searchQuery}"`}
          actionLabel="Wyczyść wyszukiwanie"
          onActionClick={() => setSearchQuery('')}
        />
      ) : (
        <>
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="card">
                <div className="card-body">
                  {tenant && canEditContent(tenant.role) && editItem?.id === item.id ? (
                    <form onSubmit={onUpdate} className="space-y-3">
                      <DynamicForm
                        fields={collectionFields}
                        data={itemData}
                        onChange={setItemData}
                        errors={formErrors}
                        tenantId={tenant.tenantId}
                      />
                      <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                          className="border rounded w-full p-2"
                          value={itemStatus}
                          onChange={(e) => setItemStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="PUBLISHED">Published</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button type="button" className="btn btn-outline" onClick={() => { setEditItem(null); setItemData({}); setItemStatus('DRAFT'); setFormErrors({}); }}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge">{item.status}</span>
                          <span className="text-xs text-muted">v{item.version}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {Object.entries(item.data).map(([key, value]) => (
                            <div key={key}>
                              <div className="text-xs text-muted mb-1">{key}</div>
                              <div>{renderField(key, value)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-muted mt-2">
                          Created: {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {tenant && canEditContent(tenant.role) && (
                        <div className="flex items-center gap-2">
                          <button
                            className="btn btn-outline"
                            onClick={() => {
                              setEditItem(item);
                              setItemData(item.data);
                              setItemStatus(item.status);
                            }}
                          >
                            Edit
                          </button>
                          <button className="btn btn-outline" onClick={() => onDelete(item.id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                className="btn btn-outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              <button
                className="btn btn-outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal open={open} onClose={() => { setOpen(false); setItemData({}); setFormErrors({}); }} title="New Item">
        <form onSubmit={onCreate} className="space-y-3">
          <DynamicForm
            fields={collectionFields}
            data={itemData}
            onChange={setItemData}
            errors={formErrors}
            tenantId={tenant?.tenantId}
          />
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="border rounded w-full p-2"
              value={itemStatus}
              onChange={(e) => setItemStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button type="button" className="btn btn-outline" onClick={() => { setOpen(false); setItemData({}); setFormErrors({}); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, itemId: '', itemName: '' })}
        onConfirm={confirmDelete}
        title="Usuń element"
        message={`Czy na pewno chcesz usunąć element "${deleteConfirm.itemName}"? Ta operacja jest nieodwracalna.`}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
      />
    </div>
  );
}

