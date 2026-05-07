/**
 * BWD Application Fee Schedule
 * Fees are still grouped into the same 3 pricing tiers,
 * but the UI now exposes the more specific classifications used by staff.
 */

export type ConcessionaireClassification =
  | "residential"
  | "commercial_c"
  | "industrial"
  | "commercial_b"
  | "commercial_c_1"
  | "commercial"
  | "commercial_a"
  | "government"
  | "special"
  | "bulksale"
  | "unbilled"
  | "special_2"
  | "government_2";

type FeeTier = "tier_3000" | "tier_4000" | "tier_5000";

export type FeeBreakdown = {
  classification: ConcessionaireClassification;
  label: string;
  total: number;
  fullPayment: number;
  installment?: {
    initial: number;
    monthly: number;
    months: number;
  };
};

const CLASSIFICATION_METADATA: Record<ConcessionaireClassification, { label: string; tier: FeeTier }> = {
  residential: { label: "Residential", tier: "tier_3000" },
  commercial_c: { label: "Commercial C", tier: "tier_3000" },
  industrial: { label: "Industrial", tier: "tier_5000" },
  commercial_b: { label: "Commercial B", tier: "tier_4000" },
  commercial_c_1: { label: "Commercial C-1", tier: "tier_3000" },
  commercial: { label: "Commercial", tier: "tier_4000" },
  commercial_a: { label: "Commercial A", tier: "tier_4000" },
  government: { label: "Government", tier: "tier_3000" },
  special: { label: "Special", tier: "tier_3000" },
  bulksale: { label: "Bulksale", tier: "tier_5000" },
  unbilled: { label: "Unbilled", tier: "tier_3000" },
  special_2: { label: "Special 2", tier: "tier_3000" },
  government_2: { label: "Government 2", tier: "tier_3000" }
};

const FEE_TIER_DETAILS: Record<FeeTier, Omit<FeeBreakdown, "classification" | "label">> = {
  tier_3000: {
    total: 3000,
    fullPayment: 3000,
    installment: {
      initial: 1500,
      monthly: 250,
      months: 6
    }
  },
  tier_4000: {
    total: 4000,
    fullPayment: 4000
  },
  tier_5000: {
    total: 5000,
    fullPayment: 5000
  }
};

export const CLASSIFICATION_OPTIONS: { value: ConcessionaireClassification; label: string }[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial_c", label: "Commercial C" },
  { value: "industrial", label: "Industrial" },
  { value: "commercial_b", label: "Commercial B" },
  { value: "commercial_c_1", label: "Commercial C-1" },
  { value: "commercial", label: "Commercial" },
  { value: "commercial_a", label: "Commercial A" },
  { value: "government", label: "Government" },
  { value: "special", label: "Special" },
  { value: "bulksale", label: "Bulksale" },
  { value: "unbilled", label: "Unbilled" },
  { value: "special_2", label: "Special 2" },
  { value: "government_2", label: "Government 2" }
];

export function getFeeBreakdown(classification: string | null | undefined): FeeBreakdown | null {
  if (!classification) return null;

  const normalized = classification as ConcessionaireClassification;
  const metadata = CLASSIFICATION_METADATA[normalized];

  if (!metadata) {
    return null;
  }

  return {
    classification: normalized,
    label: metadata.label,
    ...FEE_TIER_DETAILS[metadata.tier]
  };
}
