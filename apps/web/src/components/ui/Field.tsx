import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, id, className, required, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = error ? `${fieldId}-error` : undefined;
    const hintId = hint ? `${fieldId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fieldId}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          ref={ref}
          id={fieldId}
          // Deliberately not forwarding the native `required` attribute:
          // it triggers the browser's own constraint-validation UI (seen
          // in the wild as a bare English "Required" bubble on mobile,
          // fighting our Zod-driven Russian error text below). Validation
          // is Zod's job end to end; `aria-required` keeps the a11y
          // semantics without the native popup.
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId ?? hintId}
          className={cn(className)}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
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
  ({ label, error, id, className, required, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = error ? `${fieldId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fieldId}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Textarea
          ref={ref}
          id={fieldId}
          // See TextField above: no native `required`, Zod owns validation.
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn("min-h-28 resize-y", className)}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);
TextAreaField.displayName = "TextAreaField";
