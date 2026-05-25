import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const variant =
    normalized.includes("disapproved") || normalized.includes("rejected") || normalized.includes("overdue")
      ? "destructive"
      : normalized.includes("approved") || normalized.includes("verified") || normalized.includes("paid")
      ? "success"
      : normalized.includes("scheduled")
        ? "secondary"
        : "warning";

  return <Badge variant={variant} className={className}>{status.replaceAll("_", " ")}</Badge>;
}
