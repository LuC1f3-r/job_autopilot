import type { InputHTMLAttributes } from "react";
import { FieldLabel } from "@/components/ui/field-label";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, className = "", ...props }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        id={inputId}
        className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-muted ${className}`}
        {...props}
      />
    </div>
  );
}
