import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/app/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border bg-card text-foreground shadow-sm hover:border-primary/25 hover:bg-muted",

        // custom
        locked:
          "bg-muted text-muted-foreground hover:bg-muted",

        primary:
          "bg-sky-500 text-white shadow-sm hover:bg-sky-600",
        primaryOutline: "bg-white text-sky-500 hover:bg-slate-100",

        secondary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-brand-dark",
        secondaryOutline: "bg-white text-green-500 hover:bg-slate-100",

        danger:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-rose-600",
        dangerOutline: "bg-white text-rose-500 hover:bg-slate-100",

        super:
          "bg-indigo-500 text-white shadow-sm hover:bg-indigo-600",
        superOutline: "bg-white text-indigo-500 hover:bg-slate-100",

        ghost:
          "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",

        sidebar:
          "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        sidebarOutline:
          "bg-primary/10 text-primary hover:bg-primary/15",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8",
        icon: "h-10 w-10",

        // custom
        rounded: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
