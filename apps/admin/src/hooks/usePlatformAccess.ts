"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, fetchPlatformRbacEffective, getAuthToken, type EffectivePermission } from "@/lib/api";

const PLATFORM_POWER_ROLE_NAMES = new Set(["Platform Root", "Platform Admin"]);
const PLATFORM_DEV_ROLE_NAMES = new Set(["Platform Root", "Platform Admin", "Platform Developer"]);

export type PlatformAccessState = {
  payload: ReturnType<typeof decodeAuthToken>;
  effective: EffectivePermission[] | null;
  isLoading: boolean;
  platformRbacRoles: string[];
  isSuperAdmin: boolean;
  isPlatformPower: boolean;
  canAccessDevTools: boolean;
  canManagePlatformRoles: boolean;
  canManageOrganizations: boolean;
  canManagePlatformUsers: boolean;
  canViewBilling: boolean;
  hasCapability: (key: string) => boolean;
};

function normalizeRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function usePlatformAccess(): PlatformAccessState {
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const platformRbacRoles = useMemo(() => normalizeRoles(payload?.platformRbacRoles), [payload?.platformRbacRoles]);

  const isSuperAdmin =
    Boolean(payload?.isSuperAdmin) ||
    platformRbacRoles.some((name) => name === "Platform Root");
  const tokenPlatformPower = platformRbacRoles.some((name) => PLATFORM_POWER_ROLE_NAMES.has(name));
  const tokenPlatformDev = platformRbacRoles.some((name) => PLATFORM_DEV_ROLE_NAMES.has(name));

  const [effective, setEffective] = useState<EffectivePermission[] | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setEffective(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void fetchPlatformRbacEffective()
      .then((next) => {
        if (!cancelled) {
          setEffective(Array.isArray(next) ? next : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEffective(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const hasCapability = (key: string) =>
    effective?.some((item) => item.key === key && item.allowed) ?? false;

  const isPlatformPower =
    isSuperAdmin ||
    tokenPlatformPower ||
    hasCapability("platform.roles.manage") ||
    hasCapability("platform.users.manage");
  const canAccessDevTools =
    isPlatformPower ||
    tokenPlatformDev ||
    hasCapability("platform.dev.tools.access");
  const canManagePlatformRoles = isPlatformPower || hasCapability("platform.roles.manage");
  const canManageOrganizations = isPlatformPower || hasCapability("platform.organizations.manage");
  const canManagePlatformUsers = isPlatformPower || hasCapability("platform.users.manage");
  const canViewBilling =
    isPlatformPower ||
    hasCapability("platform.billing.view") ||
    hasCapability("platform.billing.manage");

  return {
    payload,
    effective,
    isLoading,
    platformRbacRoles,
    isSuperAdmin,
    isPlatformPower,
    canAccessDevTools,
    canManagePlatformRoles,
    canManageOrganizations,
    canManagePlatformUsers,
    canViewBilling,
    hasCapability,
  };
}
