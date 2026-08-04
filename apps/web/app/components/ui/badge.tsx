import type { HTMLAttributes } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/app/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-600 text-white dark:bg-emerald-500",
        secondary: "border-transparent bg-muted text-muted-foreground",
        outline: "bg-background text-foreground",
        destructive:
          "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
