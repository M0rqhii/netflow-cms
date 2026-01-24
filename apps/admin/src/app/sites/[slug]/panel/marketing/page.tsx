"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardHeader, CardTitle, CardContent, Button, EmptyState } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  fetchMySites,
  fetchMarketingCampaigns,
  fetchDistributionDrafts,
  fetchPublishJobs,
  getPublishJob,
  createMarketingCampaign,
  createDistributionDraft,
  publishMarketingContent,
  getAuthToken,
  decodeAuthToken,
  type MarketingCampaign,
  type DistributionDraft,
  type PublishJob,
  type SiteInfo,
} from '@/lib/api';

type Tab = 'campaigns' | 'drafts' | 'jobs';

export default function MarketingPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [drafts, setDrafts] = useState<DistributionDraft[]>([]);
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateDraft, setShowCreateDraft] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  // Create form states
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState<Record<string, any>>({});
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['site']);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<PublishJob | null>(null);

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
        throw new Error('Missing organization ID. Please login again.');
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
      const message = err instanceof Error ? err.message : 'Failed to load marketing data';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

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

      toast.push({
        tone: 'success',
        message: 'Campaign created successfully',
      });

      setShowCreateCampaign(false);
      setCampaignName('');
      setCampaignDescription('');
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign';
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !orgId) return;

    // GUARDRAIL 1: Walidacja tytułu
    if (!draftTitle || draftTitle.trim().length === 0) {
      toast.push({
        tone: 'error',
        message: 'Tytuł draftu jest wymagany',
      });
      return;
    }

    // GUARDRAIL 2: Walidacja kanałów
    if (!selectedChannels || selectedChannels.length === 0) {
      toast.push({
        tone: 'error',
        message: 'Wybierz przynajmniej jeden kanał',
      });
      return;
    }

    try {
      await createDistributionDraft(orgId, {
        siteId: siteId,
        title: draftTitle,
        content: draftContent,
        channels: selectedChannels,
      });

      toast.push({
        tone: 'success',
        message: 'Draft utworzony pomyślnie',
      });

      setShowCreateDraft(false);
      setDraftTitle('');
      setDraftContent({});
      setSelectedChannels(['site']);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas tworzenia draftu';
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !orgId) return;

    // GUARDRAIL 1: Sprawdź czy wybrano kanały
    if (!selectedChannels || selectedChannels.length === 0) {
      toast.push({
        tone: 'error',
        message: 'Wybierz przynajmniej jeden kanał do publikacji',
      });
      return;
    }

    // GUARDRAIL 2: Sprawdź czy jest treść (jeśli nie wybrano draftu)
    if (!selectedDraftId) {
      const hasContent = draftTitle && draftTitle.trim().length > 0;
      if (!hasContent) {
        toast.push({
          tone: 'error',
          message: 'Dodaj treść marketingową, aby opublikować.',
        });
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

      toast.push({
        tone: 'success',
        message: 'Zadanie publikacji utworzone pomyślnie',
      });

      setShowPublish(false);
      setSelectedDraftId(null);
      setSelectedChannels(['site']);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas publikacji';
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
      draft: 'default',
      ready: 'default',
      published: 'success',
      archived: 'default',
      active: 'success',
      paused: 'warning',
      completed: 'success',
      pending: 'default',
      processing: 'default',
      success: 'success',
      failed: 'error',
      cancelled: 'default',
    };
    return <Badge variant={colors[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <SitePanelLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted">Loading...</div>
        </div>
      </SitePanelLayout>
    );
  }

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Marketing & Distribution"
          description="Publikuj treść wszędzie: strona, media społecznościowe, reklamy"
          action={{
            label: 'Publikuj',
            onClick: () => setShowPublish(true),
            disabled: drafts.length === 0,
            helperText: drafts.length === 0 ? 'Brak szkiców do publikacji.' : undefined,
          }}
        />

        {/* Informacja gdy brak draftów */}
        {drafts.length === 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Utwórz szkic</strong>, aby przygotować treść do publikacji.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-2 -mb-px">
            <Button
              variant={activeTab === 'campaigns' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('campaigns')}
            >
              Campaigns ({campaigns.length})
            </Button>
            <Button
              variant={activeTab === 'drafts' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('drafts')}
            >
              Drafts ({drafts.length})
            </Button>
            <Button
              variant={activeTab === 'jobs' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('jobs')}
            >
              Publish Jobs ({jobs.length})
            </Button>
          </nav>
        </div>

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Campaigns</h3>
              <Button onClick={() => setShowCreateCampaign(true)}>New Campaign</Button>
            </div>

            {campaigns.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    title="No campaigns yet"
                    description="Create a campaign to organize your marketing content"
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{campaign.name}</CardTitle>
                        {getStatusBadge(campaign.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {campaign.description && <p className="text-sm text-muted mb-2">{campaign.description}</p>}
                      <div className="text-xs text-muted">
                        {campaign._count?.distributionDrafts || 0} drafts · {campaign._count?.publishJobs || 0} jobs
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Distribution Drafts</h3>
              <Button onClick={() => setShowCreateDraft(true)}>New Draft</Button>
            </div>

            {drafts.length === 0 ? (
              <Card>
                <CardContent>
                  <div className="py-12">
                    <EmptyState
                      title="Brak szkiców do publikacji"
                      description="Utwórz szkic, aby przygotować treść do publikacji"
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-10 w-10">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                        </svg>
                      }
                      action={{
                        label: "Utwórz szkic",
                        onClick: () => setShowCreateDraft(true),
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <Card key={draft.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{draft.title}</CardTitle>
                        {getStatusBadge(draft.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap mb-2">
                        {draft.channels.map((channel) => (
                          <Badge key={channel} variant="default">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                      {draft.campaign && (
                        <div className="text-xs text-muted">Campaign: {draft.campaign.name}</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Publish Jobs</h3>

            {jobs.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    title="No publish jobs yet"
                    description="Publish content to see job status and results"
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <Card 
                    key={job.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={async () => {
                      if (!siteId || !orgId) return;
                      try {
                        const jobDetails = await getPublishJob(orgId, job.id);
                        setSelectedJob(jobDetails);
                        setSelectedJobId(job.id);
                      } catch (err) {
                        toast.push({
                          tone: 'error',
                          message: err instanceof Error ? err.message : 'Failed to load job details',
                        });
                      }
                    }}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">
                            {job.draft?.title || `Job ${job.id.slice(0, 8)}`}
                          </CardTitle>
                          {job.campaign && <div className="text-xs text-muted mt-1">{job.campaign.name}</div>}
                          {job.startedAt && (
                            <div className="text-xs text-muted mt-1">
                              Published {new Date(job.startedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap mb-2">
                        {job.channels.map((channel) => (
                          <Badge key={channel} variant="default">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                      {job.publishResults && job.publishResults.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {job.publishResults.map((result) => (
                            <div key={result.id} className="text-xs flex items-center gap-2">
                              <span className="font-medium">{result.channel}:</span>
                              {result.status === 'success' ? (
                                <span className="text-green-600">✓ Published</span>
                              ) : (
                                <span className="text-red-600">✗ Failed: {result.error}</span>
                              )}
                              {result.url && (
                                <a 
                                  href={result.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-muted">
                        Click to view details
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Campaign Modal */}
        {showCreateCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create Campaign</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={campaignDescription}
                      onChange={(e) => setCampaignDescription(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowCreateCampaign(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Draft Modal */}
        {showCreateDraft && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create Distribution Draft</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateDraft} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Channels</label>
                    <div className="space-y-2">
                      {['site', 'facebook', 'twitter', 'linkedin', 'instagram', 'ads'].map((channel) => (
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
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDraft(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Publish Modal */}
        {showPublish && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Publikuj Treść</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePublish} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Draft (opcjonalny)</label>
                    <select
                      value={selectedDraftId || ''}
                      onChange={(e) => setSelectedDraftId(e.target.value || null)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Utwórz nowy</option>
                      {drafts.map((draft) => (
                        <option key={draft.id} value={draft.id}>
                          {draft.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!selectedDraftId && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Tytuł</label>
                        <input
                          type="text"
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Kanały</label>
                    <div className="space-y-2">
                      {[
                        { id: 'site', label: 'Strona', available: true },
                        { id: 'facebook', label: 'Facebook', available: false },
                        { id: 'twitter', label: 'Twitter', available: false },
                        { id: 'linkedin', label: 'LinkedIn', available: false },
                        { id: 'instagram', label: 'Instagram', available: false },
                        { id: 'ads', label: 'Reklamy', available: true },
                      ].map((channel) => (
                        <label 
                          key={channel.id} 
                          className={`flex items-center gap-2 ${!channel.available ? 'opacity-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedChannels.includes(channel.id)}
                            disabled={!channel.available}
                            onChange={(e) => {
                              if (!channel.available) {
                                toast.push({
                                  tone: 'warning',
                                  message: `Kanał ${channel.label} nie jest połączony. Połącz konto w ustawieniach.`,
                                });
                                return;
                              }
                              if (e.target.checked) {
                                setSelectedChannels([...selectedChannels, channel.id]);
                              } else {
                                setSelectedChannels(selectedChannels.filter((c) => c !== channel.id));
                              }
                            }}
                          />
                          <span className="text-sm">{channel.label}</span>
                          {!channel.available && (
                            <span className="text-xs text-red-600">(Nie połączono)</span>
                          )}
                        </label>
                      ))}
                    </div>
                    {selectedChannels.length === 0 && (
                      <p className="text-xs text-red-600 mt-2">
                        Wybierz przynajmniej jeden kanał
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowPublish(false)}>
                      Anuluj
                    </Button>
                    <Button type="submit">Publikuj</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Job Details Modal */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
            setSelectedJob(null);
            setSelectedJobId(null);
          }}>
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedJob.draft?.title || `Job ${selectedJob.id.slice(0, 8)}`}</CardTitle>
                    {selectedJob.campaign && (
                      <div className="text-sm text-muted mt-1">Campaign: {selectedJob.campaign.name}</div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedJob(null);
                    setSelectedJobId(null);
                  }}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Status</div>
                  {getStatusBadge(selectedJob.status)}
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Channels</div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedJob.channels.map((channel) => (
                      <Badge key={channel} variant="default">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
                {selectedJob.startedAt && (
                  <div>
                    <div className="text-sm font-medium mb-1">Started</div>
                    <div className="text-sm text-muted">{new Date(selectedJob.startedAt).toLocaleString()}</div>
                  </div>
                )}
                {selectedJob.completedAt && (
                  <div>
                    <div className="text-sm font-medium mb-1">Completed</div>
                    <div className="text-sm text-muted">{new Date(selectedJob.completedAt).toLocaleString()}</div>
                  </div>
                )}
                {selectedJob.publishResults && selectedJob.publishResults.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Publish Results</div>
                    <div className="space-y-2">
                      {selectedJob.publishResults.map((result) => (
                        <div key={result.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{result.channel}</span>
                            {result.status === 'success' ? (
                              <Badge variant="success">Success</Badge>
                            ) : (
                              <Badge variant="error">Failed</Badge>
                            )}
                          </div>
                          {result.url && (
                            <div className="mb-1">
                              <a 
                                href={result.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View Post →
                              </a>
                            </div>
                          )}
                          {result.publishedAt && (
                            <div className="text-xs text-muted">
                              Published {new Date(result.publishedAt).toLocaleString()}
                            </div>
                          )}
                          {result.error && (
                            <div className="text-xs text-red-600 mt-1">
                              Error: {result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SitePanelLayout>
  );
}

