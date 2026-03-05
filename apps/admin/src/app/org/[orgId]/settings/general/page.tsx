"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Input } from "@repo/ui";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { getAuthToken } from "@/lib/api";

type OrganizationData = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export default function OrgGeneralSettingsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const loadData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error("Missing auth token. Please login.");
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const res = await fetch(`${baseUrl}/organizations/${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Org-ID": orgId,
        },
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || "Failed to load organization");
      }

      const data = await res.json();
      setOrganization(data);
      setName(data.name || "");
      setSlug(data.slug || "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load organization";
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name) return;

    try {
      setSaving(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error("Missing auth token. Please login.");
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const res = await fetch(`${baseUrl}/organizations/${orgId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Org-ID": orgId,
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || "Failed to save organization settings");
      }

      toast.push({ tone: "success", message: "Organization settings saved" });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save organization settings";
      toast.push({ tone: "error", message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div style={{ color: "var(--muted)" }}>Loading organization settings...</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="card card-pad">
        <div style={{ color: "var(--muted)" }}>Organization not found.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card card-pad">
        <div className="section-title">General Settings</div>
        <div className="detail-label" style={{ marginTop: 6 }}>
          Manage organization name, slug, and plan.
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <form onSubmit={handleSave} className="space-y-3" style={{ maxWidth: 520 }}>
          <Input
            label="Organization name"
            placeholder="e.g., Acme Inc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            helperText="The display name of your organization."
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Slug</label>
            <Input
              value={slug}
              onChange={(e) => {
                const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
                setSlug(newSlug);
              }}
              pattern="[a-z0-9-]+"
              helperText="URL-friendly identifier (lowercase, hyphens only)."
              disabled
            />
            <p className="text-xs text-muted mt-1">Slug cannot be changed after creation.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Organization ID</label>
            <code className="block text-xs bg-surface-2 px-3 py-3 rounded">{organization.id}</code>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Plan</label>
            <div className="flex items-center gap-2">
              <Badge tone="default">{organization.plan}</Badge>
              <span className="text-xs text-muted">Plan changes are handled in Billing.</span>
            </div>
          </div>

          <div className="row-wrap">
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">Danger zone</div>
        <div className="spacer-sm" />
        <div className="card error-alert">
          <div style={{ fontWeight: 800 }} className="text-error">Delete organization</div>
          <div className="text-error" style={{ fontSize: 12, marginTop: 6 }}>
            This action is irreversible.
          </div>
          <div className="spacer-sm" />
          <button className="btn" type="button" disabled>Delete organization</button>
        </div>
      </div>
    </div>
  );
}
