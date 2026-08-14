import { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, id, className, children, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-slate-800">
          {label}
        </label>
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
            error && "border-[var(--color-destructive)]",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p role="alert" className="text-xs text-[var(--color-destructive)]">
            {error}
          </p>
        )}
      </div>
    );
  },
);
SelectField.displayName = "SelectField";
