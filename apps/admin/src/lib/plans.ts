export type NormalizedPlanTier = "basic" | "pro";

const PRO_PLAN_ALIASES = new Set([
  "pro",
  "professional",
  "enterprise",
  "premium",
  "business",
  "max",
]);

export function normalizePlanTier(value: string | null | undefined): NormalizedPlanTier {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (PRO_PLAN_ALIASES.has(normalized)) return "pro";
  return "basic";
}

export function formatPlanTierLabel(value: string | null | undefined): "BASIC" | "PRO" {
  return normalizePlanTier(value) === "pro" ? "PRO" : "BASIC";
}

