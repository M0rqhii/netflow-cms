"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Modal } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import {
  fetchMySites,
  fetchMarketingCampaigns,
  fetchDistributionDrafts,
  fetchPublishJobs,
  createMarketingCampaign,
  createDistributionDraft,
  publishMarketingContent,
  getAuthToken,
  decodeAuthToken,
  type MarketingCampaign,
  type DistributionDraft,
  type PublishJob,
} from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import { timeAgo, clamp } from "@/lib/formatters";

function postStatusBadge(status: string) {
  if (status === "Published") return ["Published", "badge green"] as const;
  if (status === "Draft") return ["Draft", "badge gray"] as const;
  if (status === "Scheduled") return ["Scheduled", "badge blue"] as const;
  if (status === "Pending") return ["Pending", "badge orange"] as const;
  return [String(status || "Unknown"), "badge gray"] as const;
}

export default function MarketingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [drafts, setDrafts] = useState<DistributionDraft[]>([]);
  const [, setJobs] = useState<PublishJob[]>([]);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateDraft, setShowCreateDraft] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PublishJob | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState<Record<string, unknown>>({});
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["site"]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const sites = await fetchMySites();
      const site = sites.find((s: SiteInfo) => s.site.slug === slug);

      if (!site) {
        throw new Error(`Site with slug "${slug}" not found`);
      }

      const id = site.siteId;
      setSiteId(id);

      const token = getAuthToken();
      const payload = token ? decodeAuthToken(token) : null;
      const resolvedOrgId = payload?.orgId;
      if (!resolvedOrgId) {
        throw new Error("Missing organization ID. Please login again.");
      }
      setOrgId(resolvedOrgId);

      const [campaignsData, draftsData, jobsData] = await Promise.all([
        fetchMarketingCampaigns(resolvedOrgId, { siteId: id }).catch(() => ({ campaigns: [], pagination: { total: 0, page: 1, pageSize: 20 } })),
        fetchDistributionDrafts(resolvedOrgId, { siteId: id }).catch(() => ({ drafts: [], pagination: { total: 0, page: 1, pageSize: 20 } })),
        fetchPublishJobs(resolvedOrgId, { siteId: id }).catch(() => ({ jobs: [], pagination: { total: 0, page: 1, pageSize: 20 } })),
      ]);

      setCampaigns(campaignsData.campaigns || []);
      setDrafts(draftsData.drafts || []);
      setJobs(jobsData.jobs || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.marketingUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !orgId || !campaignName.trim()) return;

    try {
      await createMarketingCampaign(orgId, {
        siteId: siteId,
        name: campaignName,
        description: campaignDescription || undefined,
      });

      toast.push({ tone: "success", message: t("sitePanelShell.marketingUi.toasts.campaignCreated") });
      setShowCreateCampaign(false);
      setCampaignName("");
      setCampaignDescription("");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.marketingUi.toasts.campaignCreateError");
      toast.push({ tone: "error", message });
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !orgId) return;

    if (!draftTitle || draftTitle.trim().length === 0) {
      toast.push({ tone: "error", message: t("sitePanelShell.marketingUi.toasts.draftTitleRequired") });
      return;
    }

    if (!selectedChannels || selectedChannels.length === 0) {
      toast.push({ tone: "error", message: t("sitePanelShell.marketingUi.toasts.channelRequired") });
      return;
    }

    try {
      await createDistributionDraft(orgId, {
        siteId: siteId,
        title: draftTitle,
        content: draftContent,
        channels: selectedChannels,
      });

      toast.push({ tone: "success", message: t("sitePanelShell.marketingUi.toasts.draftCreated") });

      setShowCreateDraft(false);
      setDraftTitle("");
      setDraftContent({});
      setSelectedChannels(["site"]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.marketingUi.toasts.draftCreateError");
      toast.push({ tone: "error", message });
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !orgId) return;

    if (!selectedChannels || selectedChannels.length === 0) {
      toast.push({ tone: "error", message: t("sitePanelShell.marketingUi.toasts.channelRequired") });
      return;
    }

    if (!selectedDraftId) {
      const hasContent = draftTitle && draftTitle.trim().length > 0;
      if (!hasContent) {
        toast.push({ tone: "error", message: t("sitePanelShell.marketingUi.toasts.publishContentRequired") });
        return;
      }
    }

    try {
      await publishMarketingContent(orgId, {
        siteId: siteId,
        draftId: selectedDraftId || undefined,
        channels: selectedChannels,
        content: selectedDraftId ? undefined : draftContent,
        title: selectedDraftId ? undefined : draftTitle,
      });

      toast.push({ tone: "success", message: t("sitePanelShell.marketingUi.toasts.publishCreated") });
      setShowPublish(false);
      setSelectedDraftId(null);
      setSelectedChannels(["site"]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.marketingUi.toasts.publishError");
      toast.push({ tone: "error", message });
    }
  };

  const total = drafts.length;
  const draftsCount = drafts.filter((d) => d.status === "draft" || d.status === "ready").length;
  const scheduled = Math.max(0, Math.round(total * 0.25));

  const collections = campaigns.map((c) => c.name).slice(0, 6);

  const list = drafts
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .map((d) => {
      const [txt, cls] = postStatusBadge(String(d.status || "Draft"));
      const tags = (d.channels || []).slice(0, 3);
      return (
        <div key={d.id} className="list-row">
          <div className="min-w-0">
            <div className="truncate project-name">
              {d.title}
            </div>
            <div className="detail-label mt-2">
              {(d.campaign?.name || "Marketing")} - {(d.createdById || "Team")} - {timeAgo(d.updatedAt || d.createdAt)}
            </div>
            <div className="tag-row">
              {tags.map((t) => (
                <span key={t} className="badge gray">#{t}</span>
              ))}
              <span className="badge blue">SEO: {clamp(60 + tags.length * 6, 60, 95)}</span>
            </div>
          </div>
          <div className="row-wrap">
            <span className={cls}>{txt}</span>
            <button className="btn" type="button" onClick={() => setShowCreateDraft(true)}>{t("common.edit")}</button>
          </div>
        </div>
      );
    });

  const right = (
    <>
      <button className="btn" type="button" onClick={() => setShowCreateCampaign(true)}>{t("sitePanelShell.actions.newCampaign")}</button>
      <button className="btn btn-primary" type="button" onClick={() => setShowCreateDraft(true)}>{t("sitePanelShell.actions.newDraft")}</button>
    </>
  );

  if (loading) {
    return (
      <SitePanelLayout>
        <div className="card card-pad text-muted">{t("common.loading")}</div>
      </SitePanelLayout>
    );
  }

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="marketing"
      title={t("sitePanelShell.marketing.title", { site: slug })}
      subtitle={t("sitePanelShell.marketing.subtitle")}
      actions={right}
    >
      <div className="animate-fade-in">

        <div className="grid cols-3">
          <div className="card stat-card">
            <div className="detail-label">{t("sitePanelShell.marketingUi.cards.entries")}</div>
            <div className="spacer-sm" />
            <div className="stat-value">{total}</div>
            <div className="spacer-sm" />
            <span className="badge gray">{t("sitePanelShell.marketingUi.cards.collections", { count: collections.length })}</span>
          </div>
          <div className="card stat-card">
            <div className="detail-label">{t("sitePanelShell.marketingUi.cards.drafts")}</div>
            <div className="spacer-sm" />
            <div className="stat-value">{draftsCount}</div>
            <div className="spacer-sm" />
            <span className="badge blue">{t("sitePanelShell.marketingUi.cards.scheduled", { count: scheduled })}</span>
          </div>
          <div className="card stat-card">
            <div className="detail-label">{t("sitePanelShell.marketingUi.cards.authors")}</div>
            <div className="spacer-sm" />
            <div className="stat-value">{Math.max(3, Math.min(5, collections.length + 1))}</div>
            <div className="spacer-sm" />
            <span className="badge green">{t("sitePanelShell.marketingUi.cards.workflowOk")}</span>
          </div>
        </div>

        <div className="spacer" />

        <div className="grid cols-2 items-start">
          <div className="card card-pad">
            <div className="section-header">
              <div className="section-title">{t("sitePanelShell.marketingUi.sections.collections")}</div>
              <span className="badge gray">Mock</span>
            </div>
            <div className="spacer-sm" />
            <div className="row-wrap">
              {collections.length === 0 ? (
                <span className="badge gray">{t("sitePanelShell.marketingUi.states.noCollections")}</span>
              ) : (
                collections.map((c) => (
                  <span key={c} className="badge gray">{c}</span>
                ))
              )}
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-header">
              <div className="section-title">{t("sitePanelShell.marketingUi.cards.entries")}</div>
              <span className="badge gray">{t("sitePanelShell.marketingUi.sections.searchEmpty")}</span>
            </div>
            <div className="spacer-sm" />
            {list.length === 0 ? (
              <div className="text-muted">{t("sitePanelShell.marketingUi.states.noResults")}</div>
            ) : (
              <div>{list}</div>
            )}
          </div>
        </div>

        {showCreateCampaign && (
          <Modal isOpen={showCreateCampaign} onClose={() => setShowCreateCampaign(false)} title={t("sitePanelShell.marketingUi.modals.createCampaignTitle")} size="sm">
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.marketingUi.fields.name")}</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.marketingUi.fields.description")}</label>
                <textarea
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="row-wrap justify-end">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateCampaign(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn btn-primary">{t("common.create")}</button>
              </div>
            </form>
          </Modal>
        )}

        {showCreateDraft && (
          <Modal isOpen={showCreateDraft} onClose={() => setShowCreateDraft(false)} title={t("sitePanelShell.marketingUi.modals.createDraftTitle")} size="sm">
            <form onSubmit={handleCreateDraft} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.marketingUi.fields.title")}</label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.marketingUi.fields.channels")}</label>
                <div className="space-y-3">
                  {["site", "facebook", "twitter", "linkedin", "instagram", "ads"].map((channel) => (
                    <label key={channel} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChannels([...selectedChannels, channel]);
                          } else {
                            setSelectedChannels(selectedChannels.filter((c) => c !== channel));
                          }
                        }}
                      />
                      <span className="text-sm capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="row-wrap justify-end">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateDraft(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn btn-primary">{t("common.create")}</button>
              </div>
            </form>
          </Modal>
        )}

        {showPublish && (
          <Modal isOpen={showPublish} onClose={() => setShowPublish(false)} title={t("sitePanelShell.marketingUi.modals.publishTitle")} size="sm">
            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.marketingUi.fields.optionalDraft")}</label>
                <select
                  value={selectedDraftId || ""}
                  onChange={(e) => setSelectedDraftId(e.target.value || null)}
                  className="input"
                >
                  <option value="">{t("sitePanelShell.marketingUi.fields.createNew")}</option>
                  {drafts.map((draft) => (
                    <option key={draft.id} value={draft.id}>
                      {draft.title}
                    </option>
                  ))}
                </select>
              </div>
              {!selectedDraftId && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.marketingUi.fields.title")}</label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="input"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.marketingUi.fields.channels")}</label>
                <div className="space-y-3">
                  {["site", "facebook", "twitter", "linkedin", "instagram", "ads"].map((channel) => (
                    <label key={channel} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChannels([...selectedChannels, channel]);
                          } else {
                            setSelectedChannels(selectedChannels.filter((c) => c !== channel));
                          }
                        }}
                      />
                      <span className="text-sm capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="row-wrap justify-end">
                <button type="button" className="btn btn-outline" onClick={() => setShowPublish(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn btn-primary">{t("sitePanelShell.marketingUi.actions.publish")}</button>
              </div>
            </form>
          </Modal>
        )}

        {selectedJob && (
          <Modal
            isOpen={!!selectedJob}
            onClose={() => setSelectedJob(null)}
            title={selectedJob.draft?.title || `Job ${selectedJob.id.slice(0, 8)}`}
            size="lg"
          >
            <div className="space-y-4">
              {selectedJob.campaign && (
                <div className="text-sm text-muted">{t("sitePanelShell.marketingUi.fields.campaign", { name: selectedJob.campaign.name })}</div>
              )}
              <div>
                <div className="text-sm font-medium mb-2">{t("sitePanelShell.marketingUi.fields.status")}</div>
                <span className="badge gray">{selectedJob.status}</span>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </SitePanelLayout>
  );
}
