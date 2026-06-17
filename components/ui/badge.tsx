import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary: "border-transparent bg-secondary text-secondary-foreground font-semibold",
        outline: "border-border text-foreground bg-background",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 shadow-sm dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300",
        destructive: "border-rose-500/20 bg-rose-500/10 text-rose-700 shadow-sm dark:border-rose-400/30 dark:bg-rose-400/15 dark:text-rose-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
