export type PlanTier = "free" | "pro" | "enterprise";

export function normalizePlanTier(value: string | null | undefined): PlanTier {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "enterprise") return "enterprise";
  if (v === "pro" || v === "professional" || v === "premium" || v === "business") return "pro";
  return "free";
}

export function formatPlanTierLabel(value: string | null | undefined): "FREE" | "PRO" | "ENTERPRISE" {
  const tier = normalizePlanTier(value);
  if (tier === "enterprise") return "ENTERPRISE";
  if (tier === "pro") return "PRO";
  return "FREE";
}

