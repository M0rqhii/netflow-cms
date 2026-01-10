"use client";

import { decodeAuthToken, getAuthToken } from '@/lib/api';

type OnboardingState = {
  completedAt: string | null;
  dismissedAt: string | null;
};

type OnboardingAction = 'site_created' | 'site_panel' | 'project_opened' | 'editor_opened';

const SESSION_SEEN_KEY = 'onboarding:seen';
const SESSION_FORCE_KEY = 'onboarding:force';

function getUserKey(suffix: string): string {
  const payload = decodeAuthToken(getAuthToken());
  const userId = String(payload?.sub ?? payload?.email ?? 'anonymous');
  return `onboarding:${userId}:${suffix}`;
}

function getLocalValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

function setLocalValue(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

function removeLocalValue(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

function getRoleMarker(): string {
  const payload = decodeAuthToken(getAuthToken());
  return String(payload?.platformRole ?? payload?.role ?? '').toLowerCase();
}

function isOwnerOrAdmin(): boolean {
  const roleMarker = getRoleMarker();
  return roleMarker.includes('owner') || roleMarker.includes('admin');
}

export function getOnboardingState(): OnboardingState {
  const completedAt = getLocalValue(getUserKey('completed_at'));
  const dismissedAt = getLocalValue(getUserKey('dismissed_at'));
  return { completedAt, dismissedAt };
}

export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  const { completedAt, dismissedAt } = getOnboardingState();
  if (completedAt) return false;
  if (dismissedAt) return false;
  const seenThisSession = sessionStorage.getItem(SESSION_SEEN_KEY) === 'true';
  const forceThisSession = sessionStorage.getItem(SESSION_FORCE_KEY) === 'true';
  if (forceThisSession) return true;
  return !seenThisSession;
}

export function markOnboardingSeenThisSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_SEEN_KEY, 'true');
  sessionStorage.removeItem(SESSION_FORCE_KEY);
}

export function dismissOnboarding(): void {
  setLocalValue(getUserKey('dismissed_at'), new Date().toISOString());
  markOnboardingSeenThisSession();
}

export function completeOnboarding(): void {
  setLocalValue(getUserKey('completed_at'), new Date().toISOString());
}

export function requestOnboardingShow(): void {
  if (typeof window === 'undefined') return;
  removeLocalValue(getUserKey('dismissed_at'));
  sessionStorage.removeItem(SESSION_SEEN_KEY);
  sessionStorage.setItem(SESSION_FORCE_KEY, 'true');
  window.dispatchEvent(new CustomEvent('onboarding:show'));
}

export function trackOnboardingSuccess(action: OnboardingAction): void {
  const { completedAt } = getOnboardingState();
  if (completedAt) return;

  const ownerAdmin = isOwnerOrAdmin();
  const isSuccess =
    (ownerAdmin && (action === 'site_created' || action === 'site_panel')) ||
    (!ownerAdmin && (action === 'project_opened' || action === 'editor_opened'));

  if (isSuccess) {
    completeOnboarding();
  }
}
