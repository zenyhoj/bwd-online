/**
 * BWD Application Fee Schedule
 * Fees are still grouped into the same 3 pricing tiers,
 * but the UI now exposes the more specific classifications used by staff.
 */

export type ConcessionaireClassification =
  | "residential"
  | "government"
  | "commercial"
  | "industrial";

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
  government: { label: "Government", tier: "tier_3000" },
  commercial: { label: "Commercial", tier: "tier_4000" },
  industrial: { label: "Industrial", tier: "tier_5000" }
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
  { value: "government", label: "Government" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" }
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
