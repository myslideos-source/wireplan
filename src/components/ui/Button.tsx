import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary/90 shadow-[0_0_0_1px_rgba(27,122,74,0.25),0_2px_6px_rgba(27,122,74,0.25)]",
        secondary:
          "bg-transparent text-text border border-border hover:border-primary/60 hover:text-primary",
        ghost:
          "bg-transparent text-text-secondary hover:bg-panel-elevated hover:text-text",
        danger: "bg-error text-white hover:bg-error/90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-11 px-5 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
