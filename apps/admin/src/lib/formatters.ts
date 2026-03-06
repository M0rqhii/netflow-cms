/**
 * Shared formatting utilities used across the admin panel.
 * Single source of truth — do NOT duplicate these in page components.
 */

import { normalizePlanTier } from "@/lib/plans";

export function timeAgo(ts: string | number): string {
  const d = typeof ts === "number" ? ts : new Date(ts).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s temu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min temu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h temu`;
  const days = Math.floor(h / 24);
  return `${days}d temu`;
}

export function fmtBytes(bytes: number): string {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let v = n;
  let i = -1;
  do {
    v /= 1024;
    i++;
  } while (v >= 1024 && i < u.length - 1);
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${u[i]}`;
}

export function fmtCompact(n: number): string {
  const num = Number(n || 0);
  if (!isFinite(num)) return "0";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(Math.round(num));
}

export type BadgeStyle = readonly [label: string, className: string];

export function statusToBadge(status?: string | null): BadgeStyle {
  const s = String(status || "").toLowerCase();
  if (s === "published" || s === "live") return ["Published", "badge green"] as const;
  if (s === "draft") return ["Draft", "badge orange"] as const;
  if (s === "pending") return ["Pending", "badge blue"] as const;
  if (normalizePlanTier(s) === "pro") return ["PRO", "badge green"] as const;
  if (normalizePlanTier(s) === "basic") return ["BASIC", "badge gray"] as const;
  return [status || "Unknown", "badge gray"] as const;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
