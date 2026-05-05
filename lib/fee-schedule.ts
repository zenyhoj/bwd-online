/**
 * BWD Application Fee Schedule
 * Fees based on concessionaire classification.
 */

export type ConcessionaireClassification =
  | "residential_commercial_c"
  | "commercial_a_b"
  | "commercial_industrial_bulk";

export type FeeBreakdown = {
  classification: ConcessionaireClassification;
  label: string;
  total: number;
  /** Full payment option */
  fullPayment: number;
  /** Installment option (if available) */
  installment?: {
    initial: number;
    monthly: number;
    months: number;
  };
};

export const FEE_SCHEDULE: Record<ConcessionaireClassification, FeeBreakdown> = {
  residential_commercial_c: {
    classification: "residential_commercial_c",
    label: "Residential / Commercial C",
    total: 3000,
    fullPayment: 3000,
    installment: {
      initial: 1500,
      monthly: 250,
      months: 6
    }
  },
  commercial_a_b: {
    classification: "commercial_a_b",
    label: "Commercial A & B",
    total: 4000,
    fullPayment: 4000
  },
  commercial_industrial_bulk: {
    classification: "commercial_industrial_bulk",
    label: "Commercial / Industrial & Bulk Connection",
    total: 5000,
    fullPayment: 5000
  }
};

export const CLASSIFICATION_OPTIONS: { value: ConcessionaireClassification; label: string }[] = [
  { value: "residential_commercial_c", label: "Residential / Commercial C" },
  { value: "commercial_a_b", label: "Commercial A & B" },
  { value: "commercial_industrial_bulk", label: "Commercial / Industrial & Bulk Connection" }
];

export function getFeeBreakdown(classification: string | null | undefined): FeeBreakdown | null {
  if (!classification) return null;
  return FEE_SCHEDULE[classification as ConcessionaireClassification] ?? null;
}
