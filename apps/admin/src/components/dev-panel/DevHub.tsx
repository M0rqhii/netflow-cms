/**
 * Dev Hub (prototype-aligned)
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DevPanelLayout } from '@/components/dev-panel/DevPanelLayout';
import { useToast } from '@/components/ui/Toast';
import { decodeAuthToken, getAuthToken } from '@/lib/api';
import { timeAgo } from '@/lib/formatters';
import { readGlobalSearch, subscribeGlobalSearch } from '@/lib/shell';

const STORAGE_KEY = 'nfcms.devpanel.v1';

type DevRuntimeService = {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  errorRate: number;
  instances: number;
};

type DevRuntime = {
  env: string;
  region: string;
  apiVersion: string;
  build: {
    version: string;
    commit: string;
    builtAt: number;
    node: string;
    next: string;
  };
  services: DevRuntimeService[];
  endpoints: string[];
};

type DevApiKey = {
  id: string;
  name: string;
  scope: string;
  token: string;
  createdAt: number;
  lastUsedAt: number;
  rotatedAt: number;
  status: 'active' | 'revoked';
};

type DevWebhook = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastDeliveryAt: number;
  successRate: number;
  lastStatus: number;
  lastError: string;
};

type DevFlag = {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: 'organization' | 'site';
  updatedAt: number;
  rollout: number;
};

type DevLog = {
  id: string;
  ts: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  service: string;
  message: string;
  traceId: string;
};

type DevState = {
  runtime: DevRuntime;
  apiKeys: DevApiKey[];
  webhooks: DevWebhook[];
  flags: DevFlag[];
  logs: DevLog[];
};

const PRIVILEGED_ROLES = ['super_admin', 'org_admin', 'site_admin', 'tenant_admin', 'platform_admin'];

const uid = (p: string) => `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

const mkToken = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 10)}`;

function defaultDeveloperState(): DevState {
  const now = Date.now();
  const mkKey = (name: string, scope: string, lastUsedAgoMin: number): DevApiKey => ({
    id: uid('key'),
    name,
    scope,
    token: mkToken('nf'),
    createdAt: now - 1000 * 60 * 60 * 24 * (10 + Math.floor(Math.random() * 40)),
    lastUsedAt: now - 1000 * 60 * (lastUsedAgoMin || 12),
    rotatedAt: now - 1000 * 60 * 60 * 24 * (2 + Math.floor(Math.random() * 18)),
    status: 'active',
  });

  const mkWebhook = (url: string, events: string[], ok: boolean): DevWebhook => ({
    id: uid('wh'),
    url,
    events,
    active: true,
    lastDeliveryAt: now - 1000 * 60 * 12,
    successRate: ok ? 99.2 : 93.4,
    lastStatus: ok ? 200 : 502,
    lastError: ok ? '' : 'Bad gateway from upstream (mock)',
  });

  const mkFlag = (key: string, enabled: boolean, scope: 'organization' | 'site'): DevFlag => ({
    id: uid('ff'),
    key,
    name: key.replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    description: 'Feature flag for rollout testing (mock). UI-only behavior.',
    enabled,
    scope,
    updatedAt: now - 1000 * 60 * 60 * 6,
    rollout: enabled ? 100 : 0,
  });

  const mkLog = (level: DevLog['level'], service: string, msg: string, agoMin: number): DevLog => ({
    id: uid('log'),
    ts: now - 1000 * 60 * (agoMin || 1),
    level,
    service,
    message: msg,
    traceId: `tr_${Math.random().toString(16).slice(2, 10)}`,
  });

  return {
    runtime: {
      env: 'production',
      region: 'eu-central-1',
      apiVersion: 'v1',
      build: {
        version: '2.14.8',
        commit: '7c3d9f1',
        builtAt: now - 1000 * 60 * 60 * 5,
        node: '20.x',
        next: '15.x (mock)',
      },
      services: [
        { id: 'svc_api', name: 'API Gateway', status: 'healthy', latencyMs: 86, errorRate: 0.18, instances: 6 },
        { id: 'svc_admin', name: 'Admin Panel', status: 'healthy', latencyMs: 42, errorRate: 0.05, instances: 3 },
        { id: 'svc_worker', name: 'Workers / Queue', status: 'degraded', latencyMs: 210, errorRate: 1.12, instances: 4 },
        { id: 'svc_search', name: 'Search', status: 'healthy', latencyMs: 64, errorRate: 0.09, instances: 2 },
      ],
      endpoints: ['/api/sites', '/api/entries', '/api/media', '/api/billing', '/api/webhooks'],
    },
    apiKeys: [
      mkKey('SDK - Production', 'sdk:read write', 18),
      mkKey('CI/CD - Deploy', 'deploy:write', 73),
      mkKey('Support - Readonly', 'org:read billing:read', 240),
    ],
    webhooks: [
      mkWebhook('https://example.com/webhooks/netflow', ['deploy.completed', 'billing.invoice.created'], true),
      mkWebhook('https://example.org/hooks/ops', ['site.published', 'dns.verified', 'backup.completed'], false),
    ],
    flags: [
      mkFlag('new_builder_canvas', true, 'organization'),
      mkFlag('enable_edge_cache', true, 'site'),
      mkFlag('beta_marketplace_modules', false, 'organization'),
      mkFlag('strict_tenant_isolation', true, 'organization'),
    ],
    logs: [
      mkLog('INFO', 'api', 'Request completed: GET /api/sites (200) - 34ms', 2),
      mkLog('WARN', 'worker', 'Queue latency elevated - retrying job (mock)', 8),
      mkLog('INFO', 'billing', 'Invoice generated - February 2026', 26),
      mkLog('ERROR', 'webhook', 'Delivery failed (502) - https://example.org/hooks/ops', 43),
    ].sort((a, b) => b.ts - a.ts),
  };
}
function readState(): DevState {
  if (typeof window === 'undefined') return defaultDeveloperState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDeveloperState();
    const parsed = JSON.parse(raw) as DevState;
    return parsed || defaultDeveloperState();
  } catch {
    return defaultDeveloperState();
  }
}

function writeState(state: DevState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function fmtWhen(ts?: number) {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString('pl-PL', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(ts);
  }
}

function fmtAgo(ts?: number) {
  if (!ts) return '-';
  return timeAgo(ts);
}

function badgeForService(status: DevRuntimeService['status']) {
  if (status === 'healthy') return 'green';
  if (status === 'degraded') return 'orange';
  if (status === 'down') return 'orange';
  return 'gray';
}

function badgeForLevel(level?: string) {
  const l = String(level || '').toUpperCase();
  if (l === 'INFO') return 'blue';
  if (l === 'WARN') return 'orange';
  if (l === 'ERROR') return 'orange';
  return 'gray';
}

function maskToken(token?: string) {
  const t = String(token || '');
  if (!t) return '-';
  return `••••••••••••${t.slice(-4)}`;
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

const tabs = [
  { id: 'runtime', label: 'Runtime', href: '/dev/runtime' },
  { id: 'api-keys', label: 'API Keys', href: '/dev/api-keys' },
  { id: 'webhooks', label: 'Webhooks', href: '/dev/webhooks' },
  { id: 'logs', label: 'Logs', href: '/dev/logs' },
  { id: 'flags', label: 'Feature Flags', href: '/dev/flags' },
] as const;

export type DevHubTab = typeof tabs[number]['id'];

export function DevHub({ activeTab }: { activeTab: DevHubTab }) {
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isProd = appProfile === 'production';
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || '';
  const userPlatformRole = (payload?.platformRole as string) || '';
  const userSystemRole = (payload?.systemRole as string) || '';
  const isSuperAdmin = (payload?.isSuperAdmin as boolean) || false;
  const isPrivileged =
    PRIVILEGED_ROLES.includes(userRole) ||
    PRIVILEGED_ROLES.includes(userPlatformRole) ||
    isSuperAdmin ||
    userSystemRole === 'super_admin';

  const { push: pushToast } = useToast();
  const pathname = usePathname();

  const [state, setState] = useState<DevState>(() => defaultDeveloperState());
  const [search, setSearch] = useState('');
  const [logLevel, setLogLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [logService, setLogService] = useState<string>('all');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initial = readState();
    setState(initial);
  }, []);
  useEffect(() => {
    setSearch(readGlobalSearch());
    return subscribeGlobalSearch((nextValue) => {
      setSearch(nextValue);
    });
  }, []);

  const persist = useCallback(
    (next: DevState) => {
      setState(next);
      if (typeof window !== 'undefined') writeState(next);
    },
    [setState],
  );

  const handleCreateApiKey = useCallback(() => {
    const now = Date.now();
    const next: DevApiKey = {
      id: uid('key'),
      name: `API Key ${Math.floor(Math.random() * 90 + 10)}`,
      scope: 'sdk:read write',
      token: mkToken('nf'),
      createdAt: now,
      lastUsedAt: now - 1000 * 60 * 12,
      rotatedAt: now - 1000 * 60 * 60 * 24 * 2,
      status: 'active',
    };
    const updated = { ...state, apiKeys: [next, ...state.apiKeys] };
    persist(updated);
    pushToast({ tone: 'success', message: 'API key created (mock)' });
  }, [state, persist, pushToast]);

  const handleCreateWebhook = useCallback(() => {
    const now = Date.now();
    const next: DevWebhook = {
      id: uid('wh'),
      url: `https://example.com/hooks/${Math.random().toString(36).slice(2, 8)}`,
      events: ['deploy.completed', 'billing.invoice.created'],
      active: true,
      lastDeliveryAt: now - 1000 * 60 * 5,
      successRate: 98.8,
      lastStatus: 200,
      lastError: '',
    };
    const updated = { ...state, webhooks: [next, ...state.webhooks] };
    persist(updated);
    pushToast({ tone: 'success', message: 'Webhook added (mock)' });
  }, [state, persist, pushToast]);

  const pushLog = useCallback(
    (level: DevLog['level'], service: string, message: string) => {
      const nextLog: DevLog = {
        id: uid('log'),
        ts: Date.now(),
        level,
        service,
        message,
        traceId: `tr_${Math.random().toString(16).slice(2, 10)}`,
      };
      const updated = { ...state, logs: [nextLog, ...state.logs].slice(0, 250) };
      persist(updated);
    },
    [state, persist],
  );

  const handleGenerateLogs = useCallback(() => {
    pushLog('INFO', 'api', 'Generated mock logs (dev panel).');
    pushLog('WARN', 'worker', 'Queue latency elevated - retrying job (mock)');
    pushLog('ERROR', 'webhook', 'Delivery failed (502) - retry scheduled (mock)');
    pushToast({ tone: 'success', message: 'Generated mock logs' });
  }, [pushLog, pushToast]);

  const handleWyczyśćLogs = useCallback(() => {
    const updated = { ...state, logs: [] };
    persist(updated);
  }, [state, persist]);

  const handleDownloadLogs = useCallback(() => {
    const text = state.logs
      .map((l) => `${new Date(l.ts).toISOString()} [${l.level}] ${l.service} ${l.traceId} - ${l.message}`)
      .join('\n');
    downloadTextFile('netflow-dev-logs.txt', text);
  }, [state.logs]);

  const handleToggleFlag = useCallback(
    (id: string) => {
      const updated = {
        ...state,
        flags: state.flags.map((f) =>
          f.id === id ? { ...f, enabled: !f.enabled, rollout: !f.enabled ? 100 : 0, updatedAt: Date.now() } : f,
        ),
      };
      persist(updated);
    },
    [state, persist],
  );

  const handleToggleWebhook = useCallback(
    (id: string) => {
      const updated = {
        ...state,
        webhooks: state.webhooks.map((w) => (w.id === id ? { ...w, active: !w.active } : w)),
      };
      persist(updated);
    },
    [state, persist],
  );
  const handleTestWebhook = useCallback(
    (id: string) => {
      const updated = {
        ...state,
        webhooks: state.webhooks.map((w) =>
          w.id === id
            ? {
                ...w,
                lastDeliveryAt: Date.now(),
                lastStatus: 200,
                lastError: '',
                successRate: Math.min(100, Math.round((w.successRate || 97) + Math.random() * 2)),
              }
            : w,
        ),
      };
      persist(updated);
      pushLog('INFO', 'webhook', `Webhook test delivered (mock): ${id}`);
    },
    [state, persist, pushLog],
  );

  const handleDeleteWebhook = useCallback(
    (id: string) => {
      const updated = { ...state, webhooks: state.webhooks.filter((w) => w.id !== id) };
      persist(updated);
      pushLog('WARN', 'webhook', `Webhook deleted (mock): ${id}`);
    },
    [state, persist, pushLog],
  );

  const handleRotateKey = useCallback(
    (id: string) => {
      const updated = {
        ...state,
        apiKeys: state.apiKeys.map((k) => (k.id === id ? { ...k, token: mkToken('nf'), rotatedAt: Date.now() } : k)),
      };
      persist(updated);
    },
    [state, persist],
  );

  const handleRevokeKey = useCallback(
    (id: string) => {
      const updated = {
        ...state,
        apiKeys: state.apiKeys.map<DevApiKey>((k) => (k.id === id ? { ...k, status: 'revoked' as const } : k)),
      };
      persist(updated);
    },
    [state, persist],
  );

  const handleCopyKey = useCallback(
    (tokenValue: string) => {
      navigator.clipboard.writeText(tokenValue);
      pushToast({ tone: 'success', message: 'Token copied' });
    },
    [pushToast],
  );
  if (isProd && !isSuperAdmin) {
    return (
      <div className="card card-pad">
        <div className="font-black">Dev Panel disabled</div>
        <div className="text-muted text-xs mt-1.5">
          Only available outside production.
        </div>
      </div>
    );
  }

  if (!isPrivileged) {
    return (
      <div className="card card-pad">
        <div className="font-black">Access denied</div>
        <div className="text-muted text-xs mt-1.5">
          Only privileged users can access the Dev Panel.
        </div>
        <div className="spacer-sm" />
        <button className="btn" onClick={() => (window.location.href = '/dashboard')}>
          Back to dashboard
        </button>
      </div>
    );
  }

  const runtime = state.runtime;
  const services = runtime.services || [];

  const logServices = Array.from(new Set(state.logs.map((l) => l.service)))
    .filter(Boolean)
    .sort();

  const filteredApiKeys = state.apiKeys
    .slice()
    .filter((k) => {
      if (!search.trim()) return true;
      const blob = `${k.name} ${k.scope} ${k.status}`.toLowerCase();
      return blob.includes(search.toLowerCase());
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const filteredWebhooks = state.webhooks
    .slice()
    .filter((w) => {
      if (!search.trim()) return true;
      const blob = `${w.url} ${(w.events || []).join(' ')} ${w.active ? 'active' : 'inactive'} ${w.lastStatus} ${w.lastError}`.toLowerCase();
      return blob.includes(search.toLowerCase());
    })
    .sort((a, b) => b.lastDeliveryAt - a.lastDeliveryAt);

  const filteredFlags = state.flags
    .slice()
    .filter((f) => {
      if (!search.trim()) return true;
      const blob = `${f.key} ${f.name} ${f.description} ${f.scope}`.toLowerCase();
      return blob.includes(search.toLowerCase());
    })
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));

  const filteredLogs = state.logs
    .slice()
    .filter((l) => {
      if (logLevel !== 'ALL' && l.level !== logLevel) return false;
      if (logService !== 'all' && l.service !== logService) return false;
      if (!search.trim()) return true;
      const blob = `${l.level} ${l.service} ${l.message} ${l.traceId}`.toLowerCase();
      return blob.includes(search.toLowerCase());
    })
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 120);

  const headerActions = (
    <>
      {activeTab === 'api-keys' && (
        <button className="btn btn-primary" type="button" onClick={handleCreateApiKey}>
          Utwórz API key
        </button>
      )}
      {activeTab === 'webhooks' && (
        <button className="btn btn-primary" type="button" onClick={handleCreateWebhook}>
          Dodaj webhook
        </button>
      )}
      {activeTab === 'logs' && (
        <>
          <button className="btn" type="button" onClick={handleGenerateLogs}>
            Wygeneruj logi
          </button>
          <button className="btn btn-primary" type="button" onClick={handleDownloadLogs}>
            Pobierz logi
          </button>
        </>
      )}
    </>
  );

  return (
    <DevPanelLayout
      title="Developer"
      description="Globalny panel deweloperski (mock). Dane są przykładowe, ale mają wyglądać jak produkcja — logi, webhooki, API keys, runtime i feature flags."
      headerActions={headerActions}
    >
      <div className="spacer" />
      <div className="card tab-bar">
        <div className="pill-row">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || activeTab === tab.id;
            return (
              <Link key={tab.id} href={tab.href} className="pill-btn" aria-current={isActive ? 'page' : undefined}>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="spacer" />

      {activeTab === 'runtime' && (
        <>
          <div className="kpi-grid">
            <div className="kpi">
              <div className="label">Uptime (30d)</div>
              <div className="value">99.96%</div>
              <div className="hint">SLA: 99.9% • region: {runtime.region}</div>
            </div>
            <div className="kpi">
              <div className="label">Requests / min</div>
              <div className="value">{(128 + Math.floor(Math.random() * 40)).toLocaleString('en-US')}</div>
              <div className="hint">Średnia z ostatnich 60 min (mock)</div>
            </div>
            <div className="kpi">
              <div className="label">p95 latency</div>
              <div className="value">{140 + Math.floor(Math.random() * 40)} ms</div>
              <div className="hint">API Gateway (mock)</div>
            </div>
            <div className="kpi">
              <div className="label">Error rate</div>
              <div className="value">{(0.26 + Math.random() * 0.18).toFixed(2)}%</div>
              <div className="hint">WARN/ERROR w logach • retry w workerach</div>
            </div>
          </div>

          <div className="spacer" />
          <div className="card card-pad">
            <div className="row-between row-wrap">
              <div>
                <div className="section-title">Build & Runtime</div>
                <div className="text-muted text-xs mt-1.5">
                  <span className="badge gray">env: {runtime.env}</span>{' '}
                  <span className="badge gray">api: {runtime.apiVersion}</span>{' '}
                  <span className="badge gray">node: {runtime.build.node}</span>{' '}
                  <span className="badge gray">next: {runtime.build.next}</span>
                </div>
              </div>
              <div className="row-wrap">
                <button className="btn" type="button" onClick={() => pushToast({ tone: 'success', message: 'Org token rotated (mock)' })}>
                  Rotate org token
                </button>
                <button className="btn btn-primary" type="button" onClick={handleCreateApiKey}>
                  Create API key
                </button>
              </div>
            </div>

            <div className="spacer" />
            <div className="grid cols-2">
              <div className="card card-pad">
                <div className="font-black">Version</div>
                <div className="spacer-sm" />
                <div className="mono detail-label">
                  v{runtime.build.version} - commit {runtime.build.commit}
                </div>
                <div className="spacer-sm" />
                <div className="detail-label">
                  built: {fmtWhen(runtime.build.builtAt)} ({fmtAgo(runtime.build.builtAt)})
                </div>
              </div>
              <div className="card card-pad">
                <div className="font-black">Public endpoints</div>
                <div className="text-muted text-xs mt-1.5">(mock – bez realnego backendu)</div>
                <div className="spacer-sm" />
                <div className="codebox mono">
                  {runtime.endpoints.join('\n')}
                </div>
              </div>
            </div>
          </div>

          <div className="spacer" />
          <div className="card card-pad">
            <div className="row-between row-wrap">
              <div>
                <div className="section-title">Service health</div>
                <div className="text-muted text-xs mt-1.5">
                  Tabela wyglada produkcyjnie, ale dane sa mockowane.
                </div>
              </div>
              <div className="row-wrap">
                <span className="badge green">Operational</span>
                <span className="badge orange">Degraded</span>
              </div>
            </div>
            <div className="spacer-sm" />
            <div className="overflow-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th>Error rate</th>
                    <th>Instances</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td className="font-black">{s.name}</td>
                      <td>
                        <span className={`badge ${badgeForService(s.status)}`}>{String(s.status).toUpperCase()}</span>
                      </td>
                      <td>{s.latencyMs} ms</td>
                      <td>{s.errorRate}%</td>
                      <td>{s.instances}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="spacer" />
          <div className="grid cols-2">
            <div className="card card-pad">
              <div className="section-title">Recent deploys</div>
              <div className="text-muted text-xs mt-1.5">
                Ostatnie wdrożenia w organizacji (mock)
              </div>
              <div className="spacer-sm" />
              <div className="form-grid">
                {[
                  { title: 'Deploy', body: 'Fix: layout + spacing', ts: Date.now() - 1000 * 60 * 60 },
                  { title: 'Release', body: 'SEO tweaks and metadata', ts: Date.now() - 1000 * 60 * 60 * 3 },
                  { title: 'Hotfix', body: 'Rollback and cache reset', ts: Date.now() - 1000 * 60 * 60 * 8 },
                ].map((a, idx) => (
                  <div key={idx} className="card tab-bar">
                    <div className="row-between">
                      <div className="font-black">{a.title}</div>
                      <span className="badge blue">{fmtAgo(a.ts)}</span>
                    </div>
                    <div className="text-muted text-xs mt-1.5">{a.body}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card-pad">
              <div className="section-title">Incident timeline</div>
              <div className="text-muted text-xs mt-1.5">
                Skrót — typowy obraz systemu działającego od lat.
              </div>
              <div className="spacer-sm" />
              <div className="form-grid">
                <div className="card tab-bar">
                  <div className="row-between">
                    <div className="font-black">Queue latency elevated</div>
                    <span className="badge orange">Investigating</span>
                  </div>
                  <div className="text-muted text-xs mt-1.5">
                    Worker backlog ↑ • retries włączone (mock)
                  </div>
                </div>
                <div className="card tab-bar">
                  <div className="row-between">
                    <div className="font-black">Webhook delivery issues</div>
                    <span className="badge orange">Mitigated</span>
                  </div>
                  <div className="text-muted text-xs mt-1.5">
                    Upstream 502 • fallback 200 po retry (mock)
                  </div>
                </div>
                <div className="card tab-bar">
                  <div className="row-between">
                    <div className="font-black">All systems operational</div>
                    <span className="badge green">Resolved</span>
                  </div>
                  <div className="text-muted text-xs mt-1.5">
                    SLA spełnione • monitoring OK (mock)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'api-keys' && (
        <>
          <div className="spacer" />
          <div className="card card-pad">
            <div className="row-start row-wrap">
              <div>
                <div className="section-title">API Keys</div>
                <div className="text-muted text-xs mt-1.5">
                  Klucze są przechowywane lokalnie (LocalStorage). W realnym produkcie doszłaby rotacja i audyt w backendzie.
                </div>
              </div>
              <div className="row-wrap">
                <span className="badge gray">
                  Search: <span className="mono">{search}</span>
                </span>
                <button className="btn btn-primary" type="button" onClick={handleCreateApiKey}>
                  Utwórz API key
                </button>
              </div>
            </div>

            <div className="spacer-sm" />
            <div className="overflow-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name / Scope</th>
                    <th>Status</th>
                    <th>Token</th>
                    <th>Meta</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApiKeys.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-muted card-pad">
                        Brak kluczy.
                      </td>
                    </tr>
                  )}
                  {filteredApiKeys.map((k) => {
                    const st = k.status === 'revoked' ? 'orange' : 'green';
                    return (
                      <tr key={k.id}>
                        <td className="font-black">
                          {k.name}
                          <div className="text-muted text-xs mt-1.5">scope: {k.scope || '-'}</div>
                        </td>
                        <td>
                          <span className={`badge ${st}`}>{String(k.status || 'active').toUpperCase()}</span>
                        </td>
                        <td className="mono">{maskToken(k.token)}</td>
                        <td className="detail-label">
                          created: {fmtAgo(k.createdAt)}
                          <br />
                          used: {fmtAgo(k.lastUsedAt)}
                          <br />
                          rotated: {fmtAgo(k.rotatedAt)}
                        </td>
                        <td className="whitespace-nowrap">
                          <button className="btn" type="button" onClick={() => handleCopyKey(k.token)}>
                            Copy
                          </button>{' '}
                          <button className="btn" type="button" onClick={() => handleRotateKey(k.id)} disabled={k.status === 'revoked'}>
                            Rotate
                          </button>{' '}
                          <button className="btn" type="button" onClick={() => handleRevokeKey(k.id)} disabled={k.status === 'revoked'}>
                            Revoke
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="spacer-sm" />
            <div className="detail-label">
              Pro tip: w mockupie możesz wpisać cokolwiek w scope, a <b>Copy</b> kopiuje pełny token.
            </div>
          </div>
        </>
      )}

      {activeTab === 'webhooks' && (
        <>
          <div className="spacer" />
          <div className="card card-pad">
            <div className="row-start row-wrap">
              <div>
                <div className="section-title">Webhooks</div>
                <div className="text-muted text-xs mt-1.5">
                  Mock integracji. <b>Test</b> generuje wpisy w logach i aktualizuje statusy.
                </div>
              </div>
              <div className="row-wrap">
                <span className="badge gray">
                  Search: <span className="mono">{search}</span>
                </span>
                <button className="btn btn-primary" type="button" onClick={handleCreateWebhook}>
                  Dodaj webhook
                </button>
              </div>
            </div>

            <div className="spacer-sm" />
            <div className="overflow-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>URL / Events</th>
                    <th>State</th>
                    <th>Last delivery</th>
                    <th>Success rate</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWebhooks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-muted card-pad">
                        Brak webhooków.
                      </td>
                    </tr>
                  )}
                  {filteredWebhooks.map((w) => {
                    const ok = Number(w.lastStatus || 0) >= 200 && Number(w.lastStatus || 0) < 300;
                    const st = w.active ? 'green' : 'gray';
                    const last = w.lastDeliveryAt ? `${fmtAgo(w.lastDeliveryAt)} • ${w.lastStatus || '-'}` : '-';
                    return (
                      <tr key={w.id}>
                        <td className="font-black">
                          {w.url}
                          <div className="text-muted text-xs mt-1.5">
                            events: {(w.events || []).join(', ') || '-'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${st}`}>{w.active ? 'ACTIVE' : 'INACTIVE'}</span>
                        </td>
                        <td>
                          <span className={`badge ${ok ? 'green' : 'orange'}`}>{last}</span>
                          {w.lastError ? (
                            <div className="text-muted text-xs mt-1.5">{w.lastError}</div>
                          ) : null}
                        </td>
                        <td>{w.successRate ?? '-'}%</td>
                        <td className="whitespace-nowrap">
                          <button className="btn" type="button" onClick={() => handleTestWebhook(w.id)}>
                            Test
                          </button>{' '}
                          <button className="btn" type="button" onClick={() => handleToggleWebhook(w.id)}>
                            {w.active ? 'Disable' : 'Enable'}
                          </button>{' '}
                          <button className="btn" type="button" onClick={() => handleDeleteWebhook(w.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'logs' && (
        <>
          <div className="spacer" />
          <div className="card card-pad">
            <div className="row-start row-wrap">
              <div>
                <div className="section-title">Logs</div>
                <div className="text-muted text-xs mt-1.5">
                  Filtrowanie jest lokalne (UI-only). W produkcie: agregacja, retention, eksport.
                </div>
              </div>
              <div className="row-wrap">
                <button className="btn" type="button" onClick={handleGenerateLogs}>
                  Wygeneruj logi
                </button>
                <button className="btn" type="button" onClick={handleWyczyśćLogs}>
                  Wyczyść
                </button>
                <button className="btn btn-primary" type="button" onClick={handleDownloadLogs}>
                  Download
                </button>
              </div>
            </div>

            <div className="spacer-sm" />
            <div className="grid cols-2">
              <div className="card tab-bar">
                <div className="detail-label font-black">LEVEL</div>
                <div className="spacer-sm" />
                <div className="row-wrap gap-sm">
                  {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lv) => (
                    <button key={lv} className={`btn ${logLevel === lv ? 'btn-primary' : 'btn-outline'}`} type="button" onClick={() => setLogLevel(lv)}>
                      {lv}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card tab-bar">
                <div className="detail-label font-black">SERVICE</div>
                <div className="spacer-sm" />
                <div className="row-wrap gap-sm">
                  <button className={`btn ${logService === 'all' ? 'btn-primary' : 'btn-outline'}`} type="button" onClick={() => setLogService('all')}>
                    ALL
                  </button>
                  {logServices.map((sv) => (
                    <button key={sv} className={`btn ${logService === sv ? 'btn-primary' : 'btn-outline'}`} type="button" onClick={() => setLogService(sv)}>
                      {sv.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="spacer" />
          <div className="form-grid">
            {filteredLogs.length === 0 && (
              <div className="card card-pad text-muted">
                Brak logów po filtrach.
              </div>
            )}
            {filteredLogs.map((l) => (
              <div key={l.id} className="card tab-bar">
                <div className="row-between row-wrap">
                  <div className="row row-wrap">
                    <span className={`badge ${badgeForLevel(l.level)}`}>{String(l.level || 'INFO').toUpperCase()}</span>
                    <span className="badge gray">{String(l.service || 'app').toUpperCase()}</span>
                    <span className="badge gray mono">{l.traceId || '-'}</span>
                  </div>
                  <div className="detail-label">{fmtAgo(l.ts)}</div>
                </div>
                <div className="spacer-sm" />
                <div className="mono detail-label">
                  {l.message}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'flags' && (
        <>
          <div className="spacer" />
          <div className="card card-pad">
            <div className="row-start row-wrap">
              <div>
                <div className="section-title">Feature Flags</div>
                <div className="text-muted text-xs mt-1.5">
                  Przełączniki kontrolujące rollout funkcji (mock). Zapis w LocalStorage.
                </div>
              </div>
              <div className="row-wrap">
                <span className="badge gray">
                  Search: <span className="mono">{search}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="spacer" />
          <div className="form-grid">
            {filteredFlags.length === 0 && (
              <div className="card card-pad text-muted">
                Brak flag.
              </div>
            )}
            {filteredFlags.map((f) => {
              const st = f.enabled ? 'green' : 'gray';
              const scope = f.scope === 'site' ? 'Site' : 'Org';
              return (
                <div key={f.id} className="card card-pad">
                  <div className="row-start row-wrap">
                    <div>
                      <div className="row row-wrap">
                        <span className={`badge ${st}`}>{f.enabled ? 'ENABLED' : 'DISABLED'}</span>
                        <span className="badge gray">{scope}</span>
                        <span className="badge gray mono">{f.key}</span>
                      </div>
                      <div className="spacer-sm" />
                      <div className="font-black project-name">{f.name || f.key}</div>
                      <div className="text-muted text-xs mt-1.5">{f.description}</div>
                      <div className="spacer-sm" />
                      <div className="detail-label">updated: {fmtWhen(f.updatedAt)}</div>
                    </div>
                    <div className="row-wrap">
                      <button className={`btn ${f.enabled ? 'btn-outline' : 'btn-primary'}`} type="button" onClick={() => handleToggleFlag(f.id)}>
                        {f.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>

                  <div className="spacer-sm" />
                  <div className="row-between row-wrap">
                    <div className="detail-label">Rollout: {String(f.rollout ?? (f.enabled ? 100 : 0))}%</div>
                    <div className="row-wrap gap-sm">
                      <span className="badge gray">Audited (mock)</span>
                      <span className="badge gray">Tenant-safe (mock)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DevPanelLayout>
  );
}


