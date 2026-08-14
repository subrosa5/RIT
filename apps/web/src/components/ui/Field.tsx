import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const fieldClasses =
  "w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm " +
  "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[var(--color-ring)] disabled:opacity-50";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = error ? `${fieldId}-error` : undefined;
    const hintId = hint ? `${fieldId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-slate-800">
          {label}
          {props.required && <span className="text-[var(--color-destructive)]"> *</span>}
        </label>
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId ?? hintId}
          className={cn(fieldClasses, error && "border-[var(--color-destructive)]", className)}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-[var(--color-destructive)]">
            {error}
          </p>
        )}
      </div>
    );
  },
);
TextField.displayName = "TextField";

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = error ? `${fieldId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-slate-800">
          {label}
          {props.required && <span className="text-[var(--color-destructive)]"> *</span>}
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(fieldClasses, "min-h-28 resize-y", error && "border-[var(--color-destructive)]", className)}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-xs text-[var(--color-destructive)]">
            {error}
          </p>
        )}
      </div>
    );
  },
);
TextAreaField.displayName = "TextAreaField";
