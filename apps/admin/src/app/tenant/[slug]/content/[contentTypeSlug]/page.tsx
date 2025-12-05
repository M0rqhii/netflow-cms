"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { fetchMyTenants, getContentType, fetchTenantTypes, fetchContentEntries, createContentEntry, updateContentEntry, deleteContentEntry, submitContentForReview, reviewContent, getContentReviewHistory, createContentComment, getContentComments, updateContentComment, deleteContentComment, type ContentEntry } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { canEditContent, canReviewContent } from '@/lib/rbac';
import { Modal, Button, Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Form } from '@repo/ui';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';
import { ContentWorkflow } from '@/components/content/ContentWorkflow';
import DynamicForm from '@/components/content/DynamicForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { fieldsToZodSchema, fieldsToFormFields } from '@/lib/schema-utils';
import type { FieldDefinition } from '@/components/content/FieldsEditor';

export default function ContentEntriesPage() {
  const t = useTranslations();
  const params = useParams<{ slug: string; contentTypeSlug: string }>();
  const slug = params?.slug as string;
  const contentTypeSlug = params?.contentTypeSlug as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ContentEntry | null>(null);
  const [entryData, setEntryData] = useState<Record<string, unknown>>({});
  const [entryStatus, setEntryStatus] = useState<string>('draft');
  const [saving, setSaving] = useState(false);
  const [contentTypeSchema, setContentTypeSchema] = useState<Record<string, unknown> | null>(null);
  const [contentTypeFields, setContentTypeFields] = useState<FieldDefinition[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; entryId: string; entryTitle: string }>({ open: false, entryId: '', entryTitle: '' });
  const [availableContentTypes, setAvailableContentTypes] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const { push } = useToast();

  const loadEntries = useCallback(async (tenantId: string) => {
    try {
      const data = await fetchContentEntries(tenantId, contentTypeSlug);
      setEntries(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load entries');
    }
  }, [contentTypeSlug]);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyTenants();
        const tenant = list.find((x) => x.tenant.slug === slug) || null;
        if (!tenant) throw new Error('Tenant not found');
        setTenant(tenant);
        
        // Get content type schema - first find by slug, then get by id
        const types = await fetchTenantTypes(tenant.tenantId);
        setAvailableContentTypes(types.map(t => ({ id: t.id, name: t.name, slug: t.slug })));
        
        const contentTypeSummary = types.find((t) => t.slug === contentTypeSlug);
        if (contentTypeSummary) {
          const contentType = await getContentType(tenant.tenantId, contentTypeSummary.id);
          if (contentType.fields && Array.isArray(contentType.fields)) {
            const fields = contentType.fields as FieldDefinition[];
            setContentTypeFields(fields);
            // Convert fields to schema-like structure
            const schema: Record<string, unknown> = {};
            fields.forEach((field) => {
              schema[field.name] = field.type;
            });
            setContentTypeSchema(schema);
          } else if (contentType.schema) {
            setContentTypeSchema(contentType.schema as Record<string, unknown>);
          }
        }
        
        await loadEntries(tenant.tenantId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load entries');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, contentTypeSlug, loadEntries]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    if (!validateForm()) {
      push({ tone: 'error', message: 'Please fix validation errors' });
      return;
    }
    
    setSaving(true);
    try {
      await createContentEntry(tenant.tenantId, contentTypeSlug, {
        data: entryData,
        status: entryStatus,
      });
      setOpen(false);
      setEntryData({});
      setEntryStatus('draft');
      setFormErrors({});
      await loadEntries(tenant.tenantId);
      push({ tone: 'success', message: 'Entry created' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to create' });
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editEntry) return;
    
    if (!validateForm()) {
      push({ tone: 'error', message: 'Please fix validation errors' });
      return;
    }
    
    setSaving(true);
    try {
      await updateContentEntry(tenant.tenantId, contentTypeSlug, editEntry.id, {
        data: entryData,
        status: entryStatus,
      });
      setEditEntry(null);
      setEntryData({});
      setEntryStatus('draft');
      setFormErrors({});
      await loadEntries(tenant.tenantId);
      push({ tone: 'success', message: 'Entry updated' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (entryId: string) => {
    if (!tenant) return;
    const entry = entries.find(e => e.id === entryId);
    const entryTitle = entry ? (entry.data.title || entry.data.name || entry.id) : 'this entry';
    setDeleteConfirm({ open: true, entryId, entryTitle: String(entryTitle) });
  };

  const confirmDelete = async () => {
    if (!tenant) return;
    try {
      await deleteContentEntry(tenant.tenantId, contentTypeSlug, deleteConfirm.entryId);
      await loadEntries(tenant.tenantId);
      push({ tone: 'success', message: 'Entry deleted' });
      setDeleteConfirm({ open: false, entryId: '', entryTitle: '' });
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    contentTypeFields.forEach(field => {
      if (field.required && (entryData[field.name] === undefined || entryData[field.name] === null || entryData[field.name] === '')) {
        errors[field.name] = `${field.name} is required`;
      }
      
      if (field.type === 'number' && entryData[field.name] !== undefined && entryData[field.name] !== null && entryData[field.name] !== '') {
        const num = Number(entryData[field.name]);
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
      
      if (field.type === 'text' && entryData[field.name] !== undefined && entryData[field.name] !== null) {
        const str = String(entryData[field.name]);
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

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href={`/tenant/${encodeURIComponent(slug)}/types`} className="text-sm text-gray-600 hover:text-gray-900">
            ← Content Types
          </Link>
          <h1 className="text-2xl font-bold mt-2">Entries · {contentTypeSlug}</h1>
        </div>
        <div className="flex items-center gap-2">
          {tenant && canEditContent(tenant.role) && (
            <Button onClick={() => { setOpen(true); setEntryData({}); setEntryStatus('draft'); }}>
              New Entry
            </Button>
          )}
          <Link href={`/tenant/${encodeURIComponent(slug)}/types`}>
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

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
      ) : entries.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-muted">No entries yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent>
                {tenant && canEditContent(tenant.role) && editEntry?.id === entry.id ? (
                  contentTypeFields.length > 0 ? (
                    <Form
                      schema={fieldsToZodSchema(contentTypeFields)}
                      fields={[
                        ...fieldsToFormFields(contentTypeFields),
                        {
                          name: 'status',
                          label: 'Status',
                          type: 'select',
                          required: true,
                          options: [
                            { value: 'draft', label: 'Draft' },
                            { value: 'published', label: 'Published' },
                            { value: 'archived', label: 'Archived' },
                          ],
                        },
                      ]}
                      onSubmit={async (data) => {
                        if (!tenant || !editEntry) return;
                        setSaving(true);
                        try {
                          const { status, ...dataFields } = data;
                          await updateContentEntry(tenant.tenantId, contentTypeSlug, editEntry.id, {
                            data: dataFields,
                            status: status as string,
                          });
                          setEditEntry(null);
                          setEntryData({});
                          setEntryStatus('draft');
                          await loadEntries(tenant.tenantId);
                          push({ tone: 'success', message: 'Entry updated' });
                        } catch (err) {
                          push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update' });
                        } finally {
                          setSaving(false);
                        }
                      }}
                      defaultValues={{ ...entry.data, status: entry.status }}
                      submitLabel="Save"
                      isLoading={saving}
                    />
                  ) : (
                    <form onSubmit={onUpdate} className="space-y-3">
                      <DynamicForm
                        fields={contentTypeFields}
                        data={entryData}
                        onChange={setEntryData}
                        errors={formErrors}
                        tenantId={tenant.tenantId}
                        availableContentTypes={availableContentTypes}
                      />
                      <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                          className="border rounded w-full p-2"
                          value={entryStatus}
                          onChange={(e) => setEntryStatus(e.target.value)}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => { setEditEntry(null); setEntryData({}); setEntryStatus('draft'); setFormErrors({}); }}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={saving} isLoading={saving}>Save</Button>
                      </div>
                    </form>
                  )
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge">{entry.status}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(entry.data).map(([key, value]) => (
                          <div key={key}>
                            <div className="text-xs text-muted mb-1">{key}</div>
                            <div>{renderField(key, value)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted mt-2">
                        Created: {new Date(entry.createdAt).toLocaleString()}
                      </div>
                      {tenant && (
                        <div className="mt-3">
                          <ContentWorkflow
                            tenantId={tenant.tenantId}
                            contentTypeSlug={contentTypeSlug}
                            entry={entry}
                            canEdit={canEditContent(tenant.role)}
                            canReview={canReviewContent(tenant.role)}
                            onUpdate={() => loadEntries(tenant.tenantId)}
                          />
                        </div>
                      )}
                    </div>
                    {tenant && canEditContent(tenant.role) && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditEntry(entry);
                            setEntryData(entry.data);
                            setEntryStatus(entry.status);
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => onDelete(entry.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={open} onClose={() => { setOpen(false); setEntryData({}); setEntryStatus('draft'); }} title="New Entry" size="lg">
        {contentTypeFields.length > 0 ? (
          <Form
            schema={fieldsToZodSchema(contentTypeFields)}
            fields={[
              ...fieldsToFormFields(contentTypeFields),
              {
                name: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                options: [
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'archived', label: 'Archived' },
                ],
                defaultValue: 'draft',
              },
            ]}
            onSubmit={async (data) => {
              if (!tenant) return;
              setSaving(true);
              try {
                const { status, ...dataFields } = data;
                await createContentEntry(tenant.tenantId, contentTypeSlug, {
                  data: dataFields,
                  status: status as string,
                });
                setOpen(false);
                setEntryData({});
                setEntryStatus('draft');
                await loadEntries(tenant.tenantId);
                push({ tone: 'success', message: 'Entry created' });
              } catch (err) {
                push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to create' });
              } finally {
                setSaving(false);
              }
            }}
            defaultValues={{ status: 'draft' }}
            submitLabel="Create"
            isLoading={saving}
          />
        ) : (
          <form onSubmit={onCreate} className="space-y-3">
            <DynamicForm
              fields={contentTypeFields}
              data={entryData}
              onChange={setEntryData}
              errors={formErrors}
              tenantId={tenant?.tenantId}
              availableContentTypes={availableContentTypes}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="border rounded w-full p-2"
                value={entryStatus}
                onChange={(e) => setEntryStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEntryData({}); setEntryStatus('draft'); setFormErrors({}); }}>Cancel</Button>
              <Button type="submit" disabled={saving} isLoading={saving}>Create</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, entryId: '', entryTitle: '' })}
        onConfirm={confirmDelete}
        title="Usuń wpis"
        message={`Czy na pewno chcesz usunąć wpis "${deleteConfirm.entryTitle}"? Ta operacja jest nieodwracalna.`}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
      />
    </div>
  );
}

