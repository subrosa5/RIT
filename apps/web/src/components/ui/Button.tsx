import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--color-primary)] text-white hover:opacity-90 focus-visible:ring-[var(--color-ring)]",
  secondary:
    "bg-white text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-muted)] focus-visible:ring-[var(--color-ring)]",
  danger: "bg-[var(--color-destructive)] text-white hover:opacity-90 focus-visible:ring-red-400",
  ghost: "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
        "transition-colors duration-150 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
