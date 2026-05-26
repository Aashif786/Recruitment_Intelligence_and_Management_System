/** Normalize free-form AI hire text for consistent HR dashboard badges (display-only). */

export type HireRecommendationKind =
  | "strong_hire"
  | "hire"
  | "weak_hire"
  | "no_hire"
  | "unknown"

export function normalizeHireRecommendation(raw: string | null | undefined): {
  kind: HireRecommendationKind
  label: string
  badgeClass: string
} {
  const original = (raw || "").trim()
  const s = original.toLowerCase().replace(/[|_]+/g, " ").replace(/\s+/g, " ").trim()
  if (!s) {
    return { kind: "unknown", label: "—", badgeClass: "bg-slate-500 text-white" }
  }
  if (s.includes("strong") && s.includes("hire")) {
    return { kind: "strong_hire", label: "Strong hire", badgeClass: "bg-emerald-700 text-white" }
  }
  if (s.includes("weak") && s.includes("hire")) {
    return { kind: "weak_hire", label: "Weak hire", badgeClass: "bg-amber-500 text-white" }
  }
  if (
    s.includes("no hire") ||
    s.includes("not recommended") ||
    s.includes("do not hire") ||
    s.includes("reject")
  ) {
    return { kind: "no_hire", label: "No hire", badgeClass: "bg-red-600 text-white" }
  }
  if (s.includes("hire")) {
    return { kind: "hire", label: "Hire", badgeClass: "bg-emerald-600 text-white" }
  }
  return {
    kind: "unknown",
    label: original.replace(/_/g, " "),
    badgeClass: "bg-slate-600 text-white",
  }
}

export function getRecommendationLabel(score: number): string {
  if (score > 6) return 'Select';
  if (score > 4) return 'Consider';
  return 'Reject';
}

export function getRecommendationColor(score: number): string {
  if (score > 6) return 'bg-primary/10 text-primary border-primary/20';
  if (score > 4) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-destructive/10 text-destructive border-destructive/20';
}
