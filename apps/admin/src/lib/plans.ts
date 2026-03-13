export type PlanTier = "free" | "pro" | "max" | "enterprise";

export function normalizePlanTier(value: string | null | undefined): PlanTier {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "enterprise") return "enterprise";
  if (v === "max") return "max";
  if (v === "pro" || v === "professional") return "pro";
  return "free";
}

export function formatPlanTierLabel(value: string | null | undefined): "FREE" | "PRO" | "MAX" | "ENTERPRISE" {
  const tier = normalizePlanTier(value);
  if (tier === "enterprise") return "ENTERPRISE";
  if (tier === "max") return "MAX";
  if (tier === "pro") return "PRO";
  return "FREE";
}

